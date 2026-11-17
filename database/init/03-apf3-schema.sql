/* ------------------------------------------------------------------
   Mazi Flow - APF3: esquema de los servicios del corte vertical.

   Tablas nuevas para S06 (pipeline), S12/S13 (KYC), S15 (cierres),
   S16/S17/S18 (comisiones y liquidacion), S40 (auditoria) y para la
   infraestructura del ESB logico y de la saga BPM.

   Trazabilidad: "INDICACION DE PROYECTO.docx" (ETAPA 3 - APF3) exige el
   diseno tecnico del servicio, la integracion y la relacion BPM + SOA.
   Las reglas de negocio de cada tabla provienen del diseno de APF2
   (AVANCE DE PROYECTO FINAL 2.docx, fichas de servicio 06, 12, 13, 15,
   16, 17, 18 y 40, y secciones de composicion/orquestacion).

   Convenciones:
     - Tablas nuevas en dbo, PK clustered, FK explicita con NO ACTION.
     - Marcas de tiempo en UTC, sufijo Utc, default SYSUTCDATETIME().
     - Enumeraciones cerradas con CHECK, nunca con un catalogo abierto,
       salvo las etapas del pipeline y los documentos KYC, que se
       parametrizan por catalogo.
     - Sin borrado fisico de historia: las correcciones se registran.
     - Script idempotente: se puede ejecutar varias veces.

   NO usar en produccion sin revisar el seed de desarrollo.
   ------------------------------------------------------------------ */

USE [mazi_sqri_qa];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
GO

/* ==================================================================
   1. Catalogos transversales
   ================================================================== */

/* Monedas: el monto captado y la comision se denotan en una moneda
   explicita; los importes no se convierten en la base. */
IF OBJECT_ID(N'dbo.Monedas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Monedas(
        MonedaCodigo char(3) NOT NULL,
        Nombre nvarchar(60) NOT NULL,
        Simbolo nvarchar(5) NOT NULL,
        Activo bit NOT NULL
            CONSTRAINT DF_Monedas_Activo DEFAULT(1),
        CONSTRAINT PK_Monedas PRIMARY KEY CLUSTERED (MonedaCodigo ASC)
    ) ON [PRIMARY];
END
GO

/* Parametros de negocio que APF2 dejo explicitamente abiertos. Se leen
   en tiempo de ejecucion: ninguno se codifica en el servicio. */
IF OBJECT_ID(N'dbo.ConfiguracionParametros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConfiguracionParametros(
        ParametroId int IDENTITY(1,1) NOT NULL,
        Clave nvarchar(100) NOT NULL,
        Valor nvarchar(400) NOT NULL,
        TipoDato nvarchar(20) NOT NULL,
        Descripcion nvarchar(300) NULL,
        Activo bit NOT NULL
            CONSTRAINT DF_ConfiguracionParametros_Activo DEFAULT(1),
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_ConfiguracionParametros_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        CONSTRAINT PK_ConfiguracionParametros PRIMARY KEY CLUSTERED (ParametroId ASC),
        CONSTRAINT UQ_ConfiguracionParametros_Clave UNIQUE (Clave),
        CONSTRAINT CK_ConfiguracionParametros_TipoDato
            CHECK (TipoDato IN (N'ENTERO', N'DECIMAL', N'TEXTO', N'BOOLEAN', N'FECHA')),
        CONSTRAINT CK_ConfiguracionParametros_Valor
            CHECK (LEN(LTRIM(RTRIM(Valor))) > 0)
    ) ON [PRIMARY];
END
GO

/* ==================================================================
   2. S06 - Pipeline comercial (dominio D2)
   ================================================================== */

/* Las ocho etapas se siembran como datos (04-apf3-seed.sql) porque el
   documento de indicaciones no fija sus nombres. Cambiar el catalogo no
   exige tocar codigo. */
IF OBJECT_ID(N'dbo.PipelineEtapas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PipelineEtapas(
        EtapaId int IDENTITY(1,1) NOT NULL,
        Codigo nvarchar(30) NOT NULL,
        Nombre nvarchar(80) NOT NULL,
        Orden int NOT NULL,
        PermiteCierre bit NOT NULL
            CONSTRAINT DF_PipelineEtapas_PermiteCierre DEFAULT(0),
        EsFinal bit NOT NULL
            CONSTRAINT DF_PipelineEtapas_EsFinal DEFAULT(0),
        Activo bit NOT NULL
            CONSTRAINT DF_PipelineEtapas_Activo DEFAULT(1),
        CONSTRAINT PK_PipelineEtapas PRIMARY KEY CLUSTERED (EtapaId ASC),
        CONSTRAINT UQ_PipelineEtapas_Codigo UNIQUE (Codigo),
        CONSTRAINT UQ_PipelineEtapas_Orden UNIQUE (Orden),
        CONSTRAINT CK_PipelineEtapas_Orden CHECK (Orden > 0),
        CONSTRAINT CK_PipelineEtapas_CierreFinal CHECK (PermiteCierre = 0 OR EsFinal = 1)
    ) ON [PRIMARY];

    /* Una sola etapa puede habilitar el cierre ganado. */
    CREATE UNIQUE INDEX UX_PipelineEtapas_PermiteCierre
        ON dbo.PipelineEtapas (PermiteCierre)
        WHERE PermiteCierre = 1;
END
GO

/* Oportunidad: unidad de avance del pipeline. ResponsableId es el oid de
   Entra ID del freelance; no hay tabla de usuarios porque la identidad
   vive en Entra ID, igual que dbo.Contactos.ResponsableId. */
IF OBJECT_ID(N'dbo.Oportunidades', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Oportunidades(
        OportunidadId int IDENTITY(1,1) NOT NULL,
        ContactoId int NOT NULL,
        ResponsableId uniqueidentifier NOT NULL,
        EtapaId int NOT NULL,
        Estado nvarchar(20) NOT NULL,
        MontoEstimado decimal(18,2) NULL,
        MonedaCodigo char(3) NULL,
        FechaCreacionUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Oportunidades_FechaCreacionUtc DEFAULT(SYSUTCDATETIME()),
        FechaIngresoEtapaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Oportunidades_FechaIngresoEtapaUtc DEFAULT(SYSUTCDATETIME()),
        FechaResultadoUtc datetime2(7) NULL,
        MotivoPerdida nvarchar(300) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Oportunidades_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_Oportunidades PRIMARY KEY CLUSTERED (OportunidadId ASC),
        CONSTRAINT FK_Oportunidades_Contactos FOREIGN KEY (ContactoId)
            REFERENCES dbo.Contactos (Id),
        CONSTRAINT FK_Oportunidades_PipelineEtapas FOREIGN KEY (EtapaId)
            REFERENCES dbo.PipelineEtapas (EtapaId),
        CONSTRAINT FK_Oportunidades_Monedas FOREIGN KEY (MonedaCodigo)
            REFERENCES dbo.Monedas (MonedaCodigo),
        CONSTRAINT CK_Oportunidades_Estado
            CHECK (Estado IN (N'ACTIVA', N'GANADA', N'PERDIDA')),
        CONSTRAINT CK_Oportunidades_Monto CHECK (MontoEstimado IS NULL OR MontoEstimado >= 0),
        CONSTRAINT CK_Oportunidades_Moneda
            CHECK ((MontoEstimado IS NULL AND MonedaCodigo IS NULL)
                OR (MontoEstimado IS NOT NULL AND MonedaCodigo IS NOT NULL)),
        CONSTRAINT CK_Oportunidades_Perdida
            CHECK (Estado <> N'PERDIDA' OR (MotivoPerdida IS NOT NULL AND FechaResultadoUtc IS NOT NULL)),
        CONSTRAINT CK_Oportunidades_Ganada
            CHECK (Estado <> N'GANADA' OR FechaResultadoUtc IS NOT NULL)
    ) ON [PRIMARY];

    CREATE INDEX IX_Oportunidades_ContactoId ON dbo.Oportunidades (ContactoId);
    CREATE INDEX IX_Oportunidades_ResponsableEstado ON dbo.Oportunidades (ResponsableId, Estado);
    CREATE INDEX IX_Oportunidades_EtapaId ON dbo.Oportunidades (EtapaId);
END
GO

/* Historial de transiciones: S06 exige conservar cada cambio de etapa
   con su fecha, usuario y motivo. */
IF OBJECT_ID(N'dbo.OportunidadEtapaHistorial', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OportunidadEtapaHistorial(
        HistorialId int IDENTITY(1,1) NOT NULL,
        OportunidadId int NOT NULL,
        EtapaOrigenId int NULL,
        EtapaDestinoId int NOT NULL,
        FechaCambioUtc datetime2(7) NOT NULL
            CONSTRAINT DF_OportunidadEtapaHistorial_FechaCambioUtc DEFAULT(SYSUTCDATETIME()),
        UsuarioId uniqueidentifier NULL,
        UsuarioNombre nvarchar(200) NULL,
        Motivo nvarchar(300) NULL,
        Observacion nvarchar(1000) NULL,
        CorrelationId nvarchar(64) NULL,
        CONSTRAINT PK_OportunidadEtapaHistorial PRIMARY KEY CLUSTERED (HistorialId ASC),
        CONSTRAINT FK_OportunidadEtapaHistorial_Oportunidades FOREIGN KEY (OportunidadId)
            REFERENCES dbo.Oportunidades (OportunidadId),
        CONSTRAINT FK_OportunidadEtapaHistorial_EtapaOrigen FOREIGN KEY (EtapaOrigenId)
            REFERENCES dbo.PipelineEtapas (EtapaId),
        CONSTRAINT FK_OportunidadEtapaHistorial_EtapaDestino FOREIGN KEY (EtapaDestinoId)
            REFERENCES dbo.PipelineEtapas (EtapaId)
    ) ON [PRIMARY];

    CREATE INDEX IX_OportunidadEtapaHistorial_Oportunidad
        ON dbo.OportunidadEtapaHistorial (OportunidadId, FechaCambioUtc);
END
GO

/* S11 es dependencia de S15 ("proyecto existente"). Se modela el minimo
   necesario para que el cierre tenga un proyecto real al que referirse. */
IF OBJECT_ID(N'dbo.Proyectos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Proyectos(
        ProyectoId int IDENTITY(1,1) NOT NULL,
        Codigo nvarchar(30) NOT NULL,
        Nombre nvarchar(200) NOT NULL,
        Descripcion nvarchar(1000) NULL,
        MonedaCodigo char(3) NOT NULL,
        MontoObjetivo decimal(18,2) NULL,
        Activo bit NOT NULL
            CONSTRAINT DF_Proyectos_Activo DEFAULT(1),
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Proyectos_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_Proyectos PRIMARY KEY CLUSTERED (ProyectoId ASC),
        CONSTRAINT UQ_Proyectos_Codigo UNIQUE (Codigo),
        CONSTRAINT FK_Proyectos_Monedas FOREIGN KEY (MonedaCodigo)
            REFERENCES dbo.Monedas (MonedaCodigo),
        CONSTRAINT CK_Proyectos_MontoObjetivo
            CHECK (MontoObjetivo IS NULL OR MontoObjetivo >= 0)
    ) ON [PRIMARY];
END
GO

/* ==================================================================
   3. S12 / S13 - KYC (dominio D3)
   ================================================================== */

/* Catalogo del checklist: que documento se exige a cada expediente. */
IF OBJECT_ID(N'dbo.KycDocumentosRequeridos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KycDocumentosRequeridos(
        DocumentoRequeridoId int IDENTITY(1,1) NOT NULL,
        Codigo nvarchar(30) NOT NULL,
        Nombre nvarchar(150) NOT NULL,
        Descripcion nvarchar(500) NULL,
        Obligatorio bit NOT NULL
            CONSTRAINT DF_KycDocumentosRequeridos_Obligatorio DEFAULT(1),
        Orden int NOT NULL
            CONSTRAINT DF_KycDocumentosRequeridos_Orden DEFAULT(1),
        Activo bit NOT NULL
            CONSTRAINT DF_KycDocumentosRequeridos_Activo DEFAULT(1),
        CONSTRAINT PK_KycDocumentosRequeridos PRIMARY KEY CLUSTERED (DocumentoRequeridoId ASC),
        CONSTRAINT UQ_KycDocumentosRequeridos_Codigo UNIQUE (Codigo),
        CONSTRAINT CK_KycDocumentosRequeridos_Orden CHECK (Orden > 0)
    ) ON [PRIMARY];
END
GO

/* Expediente KYC: uno por oportunidad. FechaInicioUtc es el insumo de
   S13; el umbral del SLA vive en ConfiguracionParametros. */
IF OBJECT_ID(N'dbo.KycExpedientes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KycExpedientes(
        KycExpedienteId int IDENTITY(1,1) NOT NULL,
        OportunidadId int NOT NULL,
        ContactoId int NOT NULL,
        Estado nvarchar(20) NOT NULL,
        FechaInicioUtc datetime2(7) NOT NULL
            CONSTRAINT DF_KycExpedientes_FechaInicioUtc DEFAULT(SYSUTCDATETIME()),
        FechaDictamenUtc datetime2(7) NULL,
        DictamenUsuarioId uniqueidentifier NULL,
        DictamenUsuarioNombre nvarchar(200) NULL,
        Observacion nvarchar(1000) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_KycExpedientes_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_KycExpedientes PRIMARY KEY CLUSTERED (KycExpedienteId ASC),
        CONSTRAINT UQ_KycExpedientes_Oportunidad UNIQUE (OportunidadId),
        CONSTRAINT FK_KycExpedientes_Oportunidades FOREIGN KEY (OportunidadId)
            REFERENCES dbo.Oportunidades (OportunidadId),
        CONSTRAINT FK_KycExpedientes_Contactos FOREIGN KEY (ContactoId)
            REFERENCES dbo.Contactos (Id),
        CONSTRAINT CK_KycExpedientes_Estado
            CHECK (Estado IN (N'PENDIENTE', N'EN_PROCESO', N'VALIDADO', N'RECHAZADO')),
        CONSTRAINT CK_KycExpedientes_Dictamen
            CHECK (Estado NOT IN (N'VALIDADO', N'RECHAZADO') OR FechaDictamenUtc IS NOT NULL)
    ) ON [PRIMARY];

    CREATE INDEX IX_KycExpedientes_ContactoId ON dbo.KycExpedientes (ContactoId);
    CREATE INDEX IX_KycExpedientes_Estado ON dbo.KycExpedientes (Estado);
END
GO

/* Un documento del checklist dentro de un expediente. Estados de APF2:
   pendiente, recibido, validado y rechazado. */
IF OBJECT_ID(N'dbo.KycDocumentos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.KycDocumentos(
        KycDocumentoId int IDENTITY(1,1) NOT NULL,
        KycExpedienteId int NOT NULL,
        DocumentoRequeridoId int NOT NULL,
        Estado nvarchar(20) NOT NULL,
        ArchivoReferencia nvarchar(500) NULL,
        FechaRecepcionUtc datetime2(7) NULL,
        FechaRevisionUtc datetime2(7) NULL,
        RevisadoPorId uniqueidentifier NULL,
        RevisadoPorNombre nvarchar(200) NULL,
        Observacion nvarchar(1000) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_KycDocumentos_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_KycDocumentos PRIMARY KEY CLUSTERED (KycDocumentoId ASC),
        CONSTRAINT UQ_KycDocumentos_ExpedienteDocumento
            UNIQUE (KycExpedienteId, DocumentoRequeridoId),
        CONSTRAINT FK_KycDocumentos_KycExpedientes FOREIGN KEY (KycExpedienteId)
            REFERENCES dbo.KycExpedientes (KycExpedienteId),
        CONSTRAINT FK_KycDocumentos_DocumentoRequerido FOREIGN KEY (DocumentoRequeridoId)
            REFERENCES dbo.KycDocumentosRequeridos (DocumentoRequeridoId),
        CONSTRAINT CK_KycDocumentos_Estado
            CHECK (Estado IN (N'PENDIENTE', N'RECIBIDO', N'VALIDADO', N'RECHAZADO'))
    ) ON [PRIMARY];

    CREATE INDEX IX_KycDocumentos_Estado ON dbo.KycDocumentos (KycExpedienteId, Estado);
END
GO

/* ==================================================================
   4. S15 - Cierres de inversion (dominio D4)
   ================================================================== */

/* Un cierre por oportunidad (idempotencia declarada en APF2). El cierre
   es la frontera de irreversibilidad: no se borra, se anula con motivo
   y queda auditado. FreelanceId se congela aqui para que una
   reasignacion posterior de cartera no altere la comision historica. */
IF OBJECT_ID(N'dbo.CierresInversion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CierresInversion(
        CierreId int IDENTITY(1,1) NOT NULL,
        OportunidadId int NOT NULL,
        ProyectoId int NOT NULL,
        MontoCaptado decimal(18,2) NOT NULL,
        MonedaCodigo char(3) NOT NULL,
        FechaCierreUtc datetime2(7) NOT NULL,
        FreelanceId uniqueidentifier NOT NULL,
        Estado nvarchar(20) NOT NULL,
        FechaAnulacionUtc datetime2(7) NULL,
        AnuladoPorId uniqueidentifier NULL,
        MotivoAnulacion nvarchar(500) NULL,
        RegistradoPorId uniqueidentifier NOT NULL,
        RegistradoPorNombre nvarchar(200) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_CierresInversion_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_CierresInversion PRIMARY KEY CLUSTERED (CierreId ASC),
        CONSTRAINT UQ_CierresInversion_Oportunidad UNIQUE (OportunidadId),
        CONSTRAINT FK_CierresInversion_Oportunidades FOREIGN KEY (OportunidadId)
            REFERENCES dbo.Oportunidades (OportunidadId),
        CONSTRAINT FK_CierresInversion_Proyectos FOREIGN KEY (ProyectoId)
            REFERENCES dbo.Proyectos (ProyectoId),
        CONSTRAINT FK_CierresInversion_Monedas FOREIGN KEY (MonedaCodigo)
            REFERENCES dbo.Monedas (MonedaCodigo),
        CONSTRAINT CK_CierresInversion_Monto CHECK (MontoCaptado > 0),
        CONSTRAINT CK_CierresInversion_Estado
            CHECK (Estado IN (N'REGISTRADO', N'ANULADO')),
        CONSTRAINT CK_CierresInversion_Anulacion
            CHECK (Estado <> N'ANULADO'
                OR (FechaAnulacionUtc IS NOT NULL AND MotivoAnulacion IS NOT NULL))
    ) ON [PRIMARY];

    CREATE INDEX IX_CierresInversion_Proyecto ON dbo.CierresInversion (ProyectoId, FechaCierreUtc);
    CREATE INDEX IX_CierresInversion_Freelance ON dbo.CierresInversion (FreelanceId, FechaCierreUtc);
END
GO

/* ==================================================================
   5. S16 / S17 / S18 - Comisiones y liquidacion
   ================================================================== */

/* Comision: una por cierre (clave natural = CierreId). El importe total
   se considera incluido IGV y se desglosa en base + IGV; la suma exacta
   se garantiza en la base. El registro no se elimina al revertirse:
   cambia de estado y la reversion queda en su propia tabla. */
IF OBJECT_ID(N'dbo.Comisiones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Comisiones(
        ComisionId int IDENTITY(1,1) NOT NULL,
        CierreId int NOT NULL,
        FreelanceId uniqueidentifier NOT NULL,
        MonedaCodigo char(3) NOT NULL,
        MontoCaptado decimal(18,2) NOT NULL,
        TasaPorcentaje decimal(5,2) NOT NULL,
        PorcentajeIgv decimal(5,2) NOT NULL,
        ImporteTotal decimal(18,2) NOT NULL,
        BaseImponible decimal(18,2) NOT NULL,
        ImporteIgv decimal(18,2) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        FechaCalculoUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Comisiones_FechaCalculoUtc DEFAULT(SYSUTCDATETIME()),
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Comisiones_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_Comisiones PRIMARY KEY CLUSTERED (ComisionId ASC),
        CONSTRAINT UQ_Comisiones_Cierre UNIQUE (CierreId),
        CONSTRAINT FK_Comisiones_CierresInversion FOREIGN KEY (CierreId)
            REFERENCES dbo.CierresInversion (CierreId),
        CONSTRAINT FK_Comisiones_Monedas FOREIGN KEY (MonedaCodigo)
            REFERENCES dbo.Monedas (MonedaCodigo),
        CONSTRAINT CK_Comisiones_Monto CHECK (MontoCaptado > 0),
        CONSTRAINT CK_Comisiones_Tasa CHECK (TasaPorcentaje > 0 AND TasaPorcentaje <= 100),
        CONSTRAINT CK_Comisiones_Igv CHECK (PorcentajeIgv >= 0 AND PorcentajeIgv <= 100),
        CONSTRAINT CK_Comisiones_Importes CHECK (ImporteTotal > 0 AND BaseImponible > 0 AND ImporteIgv >= 0),
        CONSTRAINT CK_Comisiones_Desglose CHECK (BaseImponible + ImporteIgv = ImporteTotal),
        CONSTRAINT CK_Comisiones_Estado
            CHECK (Estado IN (N'PENDIENTE', N'LIQUIDADA', N'REVERTIDA'))
    ) ON [PRIMARY];

    CREATE INDEX IX_Comisiones_FreelanceEstado ON dbo.Comisiones (FreelanceId, Estado);
    CREATE INDEX IX_Comisiones_EstadoFecha ON dbo.Comisiones (Estado, FechaCalculoUtc);
END
GO

/* Reversion: una por comision. Guarda el motivo y el estado observado de
   KYC y desembolso en el momento de la evaluacion, para que el historico
   no dependa de datos que cambian despues. */
IF OBJECT_ID(N'dbo.ComisionReversiones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ComisionReversiones(
        ReversionId int IDENTITY(1,1) NOT NULL,
        ComisionId int NOT NULL,
        MotivoCodigo nvarchar(30) NOT NULL,
        MotivoDetalle nvarchar(500) NULL,
        EstadoKyc nvarchar(20) NULL,
        EstadoDesembolso nvarchar(20) NULL,
        FechaEvaluacionUtc datetime2(7) NOT NULL,
        FechaReversionUtc datetime2(7) NOT NULL
            CONSTRAINT DF_ComisionReversiones_FechaReversionUtc DEFAULT(SYSUTCDATETIME()),
        RegistradoPorId uniqueidentifier NOT NULL,
        RegistradoPorNombre nvarchar(200) NULL,
        Observacion nvarchar(1000) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_ComisionReversiones_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT PK_ComisionReversiones PRIMARY KEY CLUSTERED (ReversionId ASC),
        CONSTRAINT UQ_ComisionReversiones_Comision UNIQUE (ComisionId),
        CONSTRAINT FK_ComisionReversiones_Comisiones FOREIGN KEY (ComisionId)
            REFERENCES dbo.Comisiones (ComisionId),
        CONSTRAINT CK_ComisionReversiones_Motivo
            CHECK (MotivoCodigo IN (N'KYC_RECHAZADO', N'DESEMBOLSO_NO_CONCRETADO'))
    ) ON [PRIMARY];
END
GO

/* Liquidacion mensual: una por freelance, periodo y moneda. Moneda entra
   en la clave porque una liquidacion no puede sumar importes de monedas
   distintas. El dia de pago es un parametro (dia 10 del mes siguiente). */
IF OBJECT_ID(N'dbo.Liquidaciones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Liquidaciones(
        LiquidacionId int IDENTITY(1,1) NOT NULL,
        FreelanceId uniqueidentifier NOT NULL,
        Anio smallint NOT NULL,
        Mes tinyint NOT NULL,
        MonedaCodigo char(3) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        FechaGeneracionUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Liquidaciones_FechaGeneracionUtc DEFAULT(SYSUTCDATETIME()),
        FechaPagoPrevista date NOT NULL,
        TotalBase decimal(18,2) NOT NULL,
        TotalIgv decimal(18,2) NOT NULL,
        TotalImporte decimal(18,2) NOT NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_Liquidaciones_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CreadoId uniqueidentifier NULL,
        CreadoNombre nvarchar(200) NULL,
        ActualizadoFechaUtc datetime2(7) NULL,
        ActualizadoId uniqueidentifier NULL,
        ActualizadoNombre nvarchar(200) NULL,
        CONSTRAINT PK_Liquidaciones PRIMARY KEY CLUSTERED (LiquidacionId ASC),
        CONSTRAINT UQ_Liquidaciones_FreelancePeriodoMoneda
            UNIQUE (FreelanceId, Anio, Mes, MonedaCodigo),
        CONSTRAINT FK_Liquidaciones_Monedas FOREIGN KEY (MonedaCodigo)
            REFERENCES dbo.Monedas (MonedaCodigo),
        CONSTRAINT CK_Liquidaciones_Periodo CHECK (Anio BETWEEN 2000 AND 2100 AND Mes BETWEEN 1 AND 12),
        CONSTRAINT CK_Liquidaciones_Estado
            CHECK (Estado IN (N'ABIERTA', N'CERRADA', N'PAGADA')),
        CONSTRAINT CK_Liquidaciones_Totales
            CHECK (TotalBase >= 0 AND TotalIgv >= 0 AND TotalImporte > 0),
        CONSTRAINT CK_Liquidaciones_Desglose
            CHECK (TotalBase + TotalIgv = TotalImporte)
    ) ON [PRIMARY];

    CREATE INDEX IX_Liquidaciones_Freelance ON dbo.Liquidaciones (FreelanceId, Anio, Mes);
END
GO

/* Detalle: una comision se liquida una sola vez. */
IF OBJECT_ID(N'dbo.LiquidacionDetalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LiquidacionDetalle(
        LiquidacionDetalleId int IDENTITY(1,1) NOT NULL,
        LiquidacionId int NOT NULL,
        ComisionId int NOT NULL,
        ImporteBase decimal(18,2) NOT NULL,
        ImporteIgv decimal(18,2) NOT NULL,
        ImporteTotal decimal(18,2) NOT NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_LiquidacionDetalle_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT PK_LiquidacionDetalle PRIMARY KEY CLUSTERED (LiquidacionDetalleId ASC),
        CONSTRAINT UQ_LiquidacionDetalle_Comision UNIQUE (ComisionId),
        CONSTRAINT FK_LiquidacionDetalle_Liquidaciones FOREIGN KEY (LiquidacionId)
            REFERENCES dbo.Liquidaciones (LiquidacionId),
        CONSTRAINT FK_LiquidacionDetalle_Comisiones FOREIGN KEY (ComisionId)
            REFERENCES dbo.Comisiones (ComisionId),
        CONSTRAINT CK_LiquidacionDetalle_Desglose
            CHECK (ImporteBase >= 0 AND ImporteIgv >= 0 AND ImporteTotal > 0
                AND ImporteBase + ImporteIgv = ImporteTotal)
    ) ON [PRIMARY];

    CREATE INDEX IX_LiquidacionDetalle_Liquidacion ON dbo.LiquidacionDetalle (LiquidacionId);
END
GO

/* ==================================================================
   6. S40 - Auditoria (transversal)
   ================================================================== */

/* Bitacora de solo anexado (APF2: "la bitacora es de solo anexado").
   Entidad/EntidadId es polimorfico a proposito: la auditoria no depende
   de FK hacia cada tabla auditada. ValorAnterior/ValorNuevo guardan JSON
   con los campos relevantes, no la fila completa. */
IF OBJECT_ID(N'dbo.AuditoriaEventos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditoriaEventos(
        EventoId bigint IDENTITY(1,1) NOT NULL,
        FechaEventoUtc datetime2(7) NOT NULL
            CONSTRAINT DF_AuditoriaEventos_FechaEventoUtc DEFAULT(SYSUTCDATETIME()),
        CorrelationId nvarchar(64) NULL,
        UsuarioId uniqueidentifier NULL,
        UsuarioNombre nvarchar(200) NULL,
        RolCodigo nvarchar(50) NULL,
        ServicioCodigo nvarchar(10) NOT NULL,
        Operacion nvarchar(80) NOT NULL,
        Entidad nvarchar(80) NULL,
        EntidadId nvarchar(64) NULL,
        Resultado nvarchar(20) NOT NULL,
        ValorAnterior nvarchar(max) NULL,
        ValorNuevo nvarchar(max) NULL,
        Detalle nvarchar(max) NULL,
        DireccionIp nvarchar(45) NULL,
        UserAgent nvarchar(300) NULL,
        CONSTRAINT PK_AuditoriaEventos PRIMARY KEY CLUSTERED (EventoId ASC),
        CONSTRAINT CK_AuditoriaEventos_Resultado
            CHECK (Resultado IN (N'EXITO', N'RECHAZO', N'ERROR')),
        CONSTRAINT CK_AuditoriaEventos_Servicio
            CHECK (LEN(LTRIM(RTRIM(ServicioCodigo))) > 0),
        CONSTRAINT CK_AuditoriaEventos_Json
            CHECK ((ValorAnterior IS NULL OR ISJSON(ValorAnterior) = 1)
                AND (ValorNuevo IS NULL OR ISJSON(ValorNuevo) = 1)
                AND (Detalle IS NULL OR ISJSON(Detalle) = 1))
    ) ON [PRIMARY];

    CREATE INDEX IX_AuditoriaEventos_Fecha ON dbo.AuditoriaEventos (FechaEventoUtc);
    CREATE INDEX IX_AuditoriaEventos_Correlacion ON dbo.AuditoriaEventos (CorrelationId);
    CREATE INDEX IX_AuditoriaEventos_Entidad ON dbo.AuditoriaEventos (Entidad, EntidadId);
    CREATE INDEX IX_AuditoriaEventos_ServicioFecha ON dbo.AuditoriaEventos (ServicioCodigo, FechaEventoUtc);
END
GO

/* La bitacora no admite UPDATE ni DELETE ni siquiera para el propietario
   de la base: se rechaza en el motor. */
IF OBJECT_ID(N'dbo.TR_AuditoriaEventos_SoloAnexado', N'TR') IS NULL
    EXEC(N'CREATE TRIGGER dbo.TR_AuditoriaEventos_SoloAnexado
           ON dbo.AuditoriaEventos
           INSTEAD OF UPDATE, DELETE
           AS
           BEGIN
               SET NOCOUNT ON;
               THROW 50001, ''AuditoriaEventos es de solo anexado: no admite UPDATE ni DELETE.'', 1;
           END');
GO

/* ==================================================================
   7. ESB logico: outbox, consumidores idempotentes, idempotencia HTTP
   ================================================================== */

/* Outbox transaccional: el evento se escribe en la misma transaccion que
   el cambio de negocio. El despachador lo publica despues. */
IF OBJECT_ID(N'dbo.OutboxEventos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OutboxEventos(
        OutboxId bigint IDENTITY(1,1) NOT NULL,
        TipoEvento nvarchar(80) NOT NULL,
        Agregado nvarchar(80) NOT NULL,
        AgregadoId nvarchar(64) NOT NULL,
        Payload nvarchar(max) NOT NULL,
        CorrelationId nvarchar(64) NULL,
        IdempotencyKey nvarchar(100) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        Intentos int NOT NULL
            CONSTRAINT DF_OutboxEventos_Intentos DEFAULT(0),
        ProximoIntentoUtc datetime2(7) NOT NULL
            CONSTRAINT DF_OutboxEventos_ProximoIntentoUtc DEFAULT(SYSUTCDATETIME()),
        UltimoError nvarchar(2000) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_OutboxEventos_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        ProcesadoFechaUtc datetime2(7) NULL,
        CONSTRAINT PK_OutboxEventos PRIMARY KEY CLUSTERED (OutboxId ASC),
        CONSTRAINT UQ_OutboxEventos_IdempotencyKey UNIQUE (IdempotencyKey),
        CONSTRAINT CK_OutboxEventos_Estado
            CHECK (Estado IN (N'PENDIENTE', N'EN_PROCESO', N'PUBLICADO', N'FALLIDO', N'MUERTO')),
        CONSTRAINT CK_OutboxEventos_Intentos CHECK (Intentos >= 0),
        CONSTRAINT CK_OutboxEventos_Json CHECK (ISJSON(Payload) = 1)
    ) ON [PRIMARY];

    CREATE INDEX IX_OutboxEventos_Despacho ON dbo.OutboxEventos (Estado, ProximoIntentoUtc);
    CREATE INDEX IX_OutboxEventos_Agregado ON dbo.OutboxEventos (Agregado, AgregadoId);
END
GO

/* Consumidores idempotentes: un mensaje puede entregarse mas de una vez;
   esta tabla garantiza un solo efecto por consumidor y evento. */
IF OBJECT_ID(N'dbo.OutboxConsumidos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OutboxConsumidos(
        ConsumidoId bigint IDENTITY(1,1) NOT NULL,
        OutboxId bigint NOT NULL,
        Consumidor nvarchar(80) NOT NULL,
        Resultado nvarchar(20) NOT NULL,
        Error nvarchar(2000) NULL,
        ProcesadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_OutboxConsumidos_ProcesadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT PK_OutboxConsumidos PRIMARY KEY CLUSTERED (ConsumidoId ASC),
        CONSTRAINT UQ_OutboxConsumidos_EventoConsumidor UNIQUE (OutboxId, Consumidor),
        CONSTRAINT FK_OutboxConsumidos_OutboxEventos FOREIGN KEY (OutboxId)
            REFERENCES dbo.OutboxEventos (OutboxId),
        CONSTRAINT CK_OutboxConsumidos_Resultado
            CHECK (Resultado IN (N'PROCESADO', N'ERROR'))
    ) ON [PRIMARY];
END
GO

/* Idempotencia de comandos HTTP: la clave la envia el cliente; una
   repeticion con el mismo cuerpo devuelve la respuesta almacenada y una
   repeticion con cuerpo distinto se rechaza. */
IF OBJECT_ID(N'dbo.IdempotenciaSolicitudes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.IdempotenciaSolicitudes(
        IdempotenciaId bigint IDENTITY(1,1) NOT NULL,
        Clave nvarchar(100) NOT NULL,
        Endpoint nvarchar(200) NOT NULL,
        UsuarioId uniqueidentifier NULL,
        HashSolicitud char(64) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        CodigoRespuesta int NULL,
        CuerpoRespuesta nvarchar(max) NULL,
        CreadoFechaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_IdempotenciaSolicitudes_CreadoFechaUtc DEFAULT(SYSUTCDATETIME()),
        CompletadoFechaUtc datetime2(7) NULL,
        CONSTRAINT PK_IdempotenciaSolicitudes PRIMARY KEY CLUSTERED (IdempotenciaId ASC),
        CONSTRAINT UQ_IdempotenciaSolicitudes_Clave UNIQUE (Clave),
        CONSTRAINT CK_IdempotenciaSolicitudes_Estado
            CHECK (Estado IN (N'EN_PROCESO', N'COMPLETADA')),
        CONSTRAINT CK_IdempotenciaSolicitudes_Respuesta
            CHECK (Estado <> N'COMPLETADA'
                OR (CodigoRespuesta IS NOT NULL AND CuerpoRespuesta IS NOT NULL))
    ) ON [PRIMARY];

    CREATE INDEX IX_IdempotenciaSolicitudes_Fecha ON dbo.IdempotenciaSolicitudes (CreadoFechaUtc);
END
GO

/* ==================================================================
   8. Saga BPM: instancia por oportunidad y pasos ejecutados
   ================================================================== */

IF OBJECT_ID(N'dbo.SagaInstancias', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SagaInstancias(
        SagaInstanciaId uniqueidentifier NOT NULL
            CONSTRAINT DF_SagaInstancias_Id DEFAULT(NEWSEQUENTIALID()),
        CorrelationId nvarchar(64) NOT NULL,
        OportunidadId int NOT NULL,
        Proceso nvarchar(50) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        PasoActual int NOT NULL
            CONSTRAINT DF_SagaInstancias_PasoActual DEFAULT(0),
        IniciadaUtc datetime2(7) NOT NULL
            CONSTRAINT DF_SagaInstancias_IniciadaUtc DEFAULT(SYSUTCDATETIME()),
        FinalizadaUtc datetime2(7) NULL,
        UltimoError nvarchar(2000) NULL,
        CONSTRAINT PK_SagaInstancias PRIMARY KEY CLUSTERED (SagaInstanciaId ASC),
        CONSTRAINT UQ_SagaInstancias_CorrelationId UNIQUE (CorrelationId),
        CONSTRAINT UQ_SagaInstancias_OportunidadProceso UNIQUE (OportunidadId, Proceso),
        CONSTRAINT FK_SagaInstancias_Oportunidades FOREIGN KEY (OportunidadId)
            REFERENCES dbo.Oportunidades (OportunidadId),
        CONSTRAINT CK_SagaInstancias_Estado
            CHECK (Estado IN (N'EN_CURSO', N'COMPLETADA', N'COMPENSADA', N'FALLIDA')),
        CONSTRAINT CK_SagaInstancias_PasoActual CHECK (PasoActual >= 0)
    ) ON [PRIMARY];

    CREATE INDEX IX_SagaInstancias_Estado ON dbo.SagaInstancias (Estado, IniciadaUtc);
END
GO

IF OBJECT_ID(N'dbo.SagaPasos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SagaPasos(
        SagaPasoId bigint IDENTITY(1,1) NOT NULL,
        SagaInstanciaId uniqueidentifier NOT NULL,
        Orden int NOT NULL,
        ServicioCodigo nvarchar(10) NOT NULL,
        Accion nvarchar(100) NOT NULL,
        Estado nvarchar(20) NOT NULL,
        IniciadoUtc datetime2(7) NULL,
        FinalizadoUtc datetime2(7) NULL,
        Error nvarchar(2000) NULL,
        Payload nvarchar(max) NULL,
        CONSTRAINT PK_SagaPasos PRIMARY KEY CLUSTERED (SagaPasoId ASC),
        CONSTRAINT UQ_SagaPasos_InstanciaOrden UNIQUE (SagaInstanciaId, Orden),
        CONSTRAINT FK_SagaPasos_SagaInstancias FOREIGN KEY (SagaInstanciaId)
            REFERENCES dbo.SagaInstancias (SagaInstanciaId),
        CONSTRAINT CK_SagaPasos_Estado
            CHECK (Estado IN (N'PENDIENTE', N'EN_CURSO', N'COMPLETADO', N'FALLIDO', N'COMPENSADO')),
        CONSTRAINT CK_SagaPasos_Orden CHECK (Orden > 0),
        CONSTRAINT CK_SagaPasos_Json CHECK (Payload IS NULL OR ISJSON(Payload) = 1)
    ) ON [PRIMARY];

    CREATE INDEX IX_SagaPasos_Estado ON dbo.SagaPasos (Estado, IniciadoUtc);
END
GO

/* ==================================================================
   9. Vista de consulta para el corte: oportunidad con su etapa y su
      ultimo cierre/comision. No se usa para escritura.
   ================================================================== */
IF OBJECT_ID(N'dbo.vw_OportunidadResumen', N'V') IS NOT NULL
    DROP VIEW dbo.vw_OportunidadResumen;
GO
CREATE VIEW dbo.vw_OportunidadResumen
AS
SELECT
    o.OportunidadId,
    o.ContactoId,
    o.ResponsableId,
    o.Estado,
    o.MontoEstimado,
    o.MonedaCodigo,
    o.FechaCreacionUtc,
    o.FechaIngresoEtapaUtc,
    o.FechaResultadoUtc,
    o.MotivoPerdida,
    e.EtapaId,
    e.Codigo AS EtapaCodigo,
    e.Nombre AS EtapaNombre,
    e.Orden AS EtapaOrden,
    e.PermiteCierre AS EtapaPermiteCierre,
    e.EsFinal AS EtapaEsFinal,
    e.Activo AS EtapaActivo,
    c.NombreCompleto,
    k.KycExpedienteId,
    k.Estado AS KycEstado,
    ci.CierreId,
    ci.MontoCaptado,
    ci.FechaCierreUtc,
    co.ComisionId,
    co.ImporteTotal AS ComisionImporteTotal,
    co.Estado AS ComisionEstado
FROM dbo.Oportunidades o
INNER JOIN dbo.PipelineEtapas e ON e.EtapaId = o.EtapaId
INNER JOIN (
    SELECT Id, COALESCE(RazonSocial, LTRIM(RTRIM(CONCAT(Nombres, N' ', Apellidos)))) AS NombreCompleto
    FROM dbo.Contactos
) c ON c.Id = o.ContactoId
LEFT JOIN dbo.KycExpedientes k ON k.OportunidadId = o.OportunidadId
LEFT JOIN dbo.CierresInversion ci ON ci.OportunidadId = o.OportunidadId
LEFT JOIN dbo.Comisiones co ON co.CierreId = ci.CierreId;
GO
