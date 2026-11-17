/* ------------------------------------------------------------------
   Mazi Flow - APF3: catalogos y parametros de desarrollo.

   Idempotente. NO usar en produccion.
   Los valores marcados como supuesto se siembran como datos para no
   fijarlos en el codigo; el negocio los confirma o los cambia aqui.
   ------------------------------------------------------------------ */

USE [mazi_sqri_qa];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ------------------------------------------------------------------
   Monedas
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Monedas WHERE MonedaCodigo = 'PEN')
    INSERT INTO dbo.Monedas (MonedaCodigo, Nombre, Simbolo, Activo)
    VALUES ('PEN', N'Sol peruano', N'S/', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Monedas WHERE MonedaCodigo = 'USD')
    INSERT INTO dbo.Monedas (MonedaCodigo, Nombre, Simbolo, Activo)
    VALUES ('USD', N'Dólar estadounidense', N'US$', 1);
GO

/* ------------------------------------------------------------------
   S06 - Ocho etapas del pipeline.

   SUPUESTO A CONFIRMAR: el documento de indicaciones no enumera los
   nombres de las ocho etapas. Este catalogo es la propuesta inicial y
   se puede corregir sin tocar codigo. La etapa con PermiteCierre = 1
   es la unica que habilita el cierre ganado (restriccion de S06).
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'PROSPECTO')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'PROSPECTO', N'Prospecto', 1, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'CONTACTADO')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'CONTACTADO', N'Contactado', 2, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'CALIFICADO')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'CALIFICADO', N'Calificado', 3, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'REUNION')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'REUNION', N'Reunión', 4, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'COTIZACION')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'COTIZACION', N'Cotización', 5, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'NEGOCIACION')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'NEGOCIACION', N'Negociación', 6, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'KYC_EN_PROCESO')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'KYC_EN_PROCESO', N'KYC en proceso', 7, 0, 0, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.PipelineEtapas WHERE Codigo = N'CERRADO_GANADO')
    INSERT INTO dbo.PipelineEtapas (Codigo, Nombre, Orden, PermiteCierre, EsFinal, Activo)
    VALUES (N'CERRADO_GANADO', N'Cerrado-ganado', 8, 1, 1, 1);
GO

/* ------------------------------------------------------------------
   S12 - Checklist documental KYC.

   SUPUESTO A CONFIRMAR: APF2 no enumera los documentos del checklist.
   Esta lista es la propuesta inicial del corte vertical.
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.KycDocumentosRequeridos WHERE Codigo = N'DOC_IDENTIDAD')
    INSERT INTO dbo.KycDocumentosRequeridos (Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo)
    VALUES (N'DOC_IDENTIDAD', N'Documento de identidad', N'DNI, CE o pasaporte del inversionista', 1, 1, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.KycDocumentosRequeridos WHERE Codigo = N'FICHA_RUC')
    INSERT INTO dbo.KycDocumentosRequeridos (Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo)
    VALUES (N'FICHA_RUC', N'Ficha RUC', N'Ficha RUC vigente para personas jurídicas', 1, 2, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.KycDocumentosRequeridos WHERE Codigo = N'SUSTENTO_FONDOS')
    INSERT INTO dbo.KycDocumentosRequeridos (Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo)
    VALUES (N'SUSTENTO_FONDOS', N'Sustento de origen de fondos', N'Documento que acredita el origen de los fondos', 1, 3, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.KycDocumentosRequeridos WHERE Codigo = N'DECLARACION_PEP')
    INSERT INTO dbo.KycDocumentosRequeridos (Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo)
    VALUES (N'DECLARACION_PEP', N'Declaración jurada de PEP', N'Declaración de persona expuesta políticamente', 1, 4, 1);
IF NOT EXISTS (SELECT 1 FROM dbo.KycDocumentosRequeridos WHERE Codigo = N'CONTRATO_FIRMADO')
    INSERT INTO dbo.KycDocumentosRequeridos (Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo)
    VALUES (N'CONTRATO_FIRMADO', N'Contrato de inversión firmado', N'Contrato firmado por el inversionista', 1, 5, 1);
GO

/* ------------------------------------------------------------------
   Parametros de negocio.

   Cada valor corresponde a una decision que APF2 dejo abierta o a una
   regla declarada. El servicio los lee de aqui; no se codifican.
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'KYC_SLA_DIAS')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'KYC_SLA_DIAS', N'15', N'ENTERO', N'Supuesto: días de SLA del proceso KYC, a confirmar con Compliance (S13)');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'COMISION_TASA_PORCENTAJE')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'COMISION_TASA_PORCENTAJE', N'3.00', N'DECIMAL', N'Tasa de comisión sobre el monto captado (S16)');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'COMISION_IGV_PORCENTAJE')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'COMISION_IGV_PORCENTAJE', N'18.00', N'DECIMAL', N'IGV incluido en el importe de la comisión (S16)');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'REVERSION_PLAZO_DIAS')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'REVERSION_PLAZO_DIAS', N'30', N'ENTERO', N'Plazo de reversión en días; APF2 fija un rango de 30 a 45 por confirmar (S17)');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'LIQUIDACION_DIA_PAGO')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'LIQUIDACION_DIA_PAGO', N'10', N'ENTERO', N'Día del mes siguiente en que se paga la liquidación (S18)');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'ESB_MAX_REINTENTOS')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'ESB_MAX_REINTENTOS', N'5', N'ENTERO', N'Reintentos antes de mover el mensaje a la cola de fallidos');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'ESB_BACKOFF_BASE_SEGUNDOS')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'ESB_BACKOFF_BASE_SEGUNDOS', N'10', N'ENTERO', N'Espera base del backoff exponencial del despachador');
IF NOT EXISTS (SELECT 1 FROM dbo.ConfiguracionParametros WHERE Clave = N'ESB_BACKOFF_MAX_SEGUNDOS')
    INSERT INTO dbo.ConfiguracionParametros (Clave, Valor, TipoDato, Descripcion)
    VALUES (N'ESB_BACKOFF_MAX_SEGUNDOS', N'300', N'ENTERO', N'Techo del backoff exponencial del despachador');
GO

/* ------------------------------------------------------------------
   S11 - Proyectos de demostración.

   S15 exige que el proyecto del cierre exista. El corte vertical no
   incluye endpoints de S11, por eso los proyectos base se siembran aqui.
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Proyectos WHERE Codigo = N'PRY-001')
    INSERT INTO dbo.Proyectos (Codigo, Nombre, Descripcion, MonedaCodigo, MontoObjetivo, Activo, CreadoId, CreadoNombre)
    VALUES (N'PRY-001', N'Expansión retail', N'Proyecto de demostración para el corte vertical APF3', 'PEN', 5000000.00, 1,
            '11111111-1111-1111-1111-111111111111', N'Usuario Desarrollo');
IF NOT EXISTS (SELECT 1 FROM dbo.Proyectos WHERE Codigo = N'PRY-002')
    INSERT INTO dbo.Proyectos (Codigo, Nombre, Descripcion, MonedaCodigo, MontoObjetivo, Activo, CreadoId, CreadoNombre)
    VALUES (N'PRY-002', N'Capital de trabajo', N'Proyecto de demostración para el corte vertical APF3', 'PEN', 2500000.00, 1,
            '11111111-1111-1111-1111-111111111111', N'Usuario Desarrollo');
GO
