/* ------------------------------------------------------------------
   Mazi Flow - Datos mínimos de desarrollo local.
   Idempotente: se puede ejecutar varias veces sin duplicar filas.
   NO usar en producción.
   ------------------------------------------------------------------ */

USE [mazi_sqri_qa];
GO

/* ------------------------------------------------------------------
   Reportería: claves y matriz de roles.
   Debe coincidir con el frontend (core/auth/app-roles.ts) y con
   dbo.ReporteRoles consumido por reporteRol.repository.ts.
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Reportes WHERE Clave = N'avance_ejecutivas')
    INSERT INTO dbo.Reportes (Clave, Nombre, Activo, Descripcion, CreadoFecha)
    VALUES (N'avance_ejecutivas', N'Avance ejecutivas', 1, N'Reporte Power BI de avance por ejecutiva', SYSUTCDATETIME());
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Reportes WHERE Clave = N'funnel_conversion')
    INSERT INTO dbo.Reportes (Clave, Nombre, Activo, Descripcion, CreadoFecha)
    VALUES (N'funnel_conversion', N'Funnel de conversión', 1, N'Reporte Power BI del embudo comercial', SYSUTCDATETIME());
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Reportes WHERE Clave = N'control_operaciones')
    INSERT INTO dbo.Reportes (Clave, Nombre, Activo, Descripcion, CreadoFecha)
    VALUES (N'control_operaciones', N'Control de operaciones', 1, N'Reporte Power BI de control operativo', SYSUTCDATETIME());
GO

DECLARE @avance INT = (SELECT ReporteId FROM dbo.Reportes WHERE Clave = N'avance_ejecutivas');
DECLARE @funnel INT = (SELECT ReporteId FROM dbo.Reportes WHERE Clave = N'funnel_conversion');
DECLARE @control INT = (SELECT ReporteId FROM dbo.Reportes WHERE Clave = N'control_operaciones');

IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @avance AND RoleCodigo = N'direccion_comercial')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@avance, N'direccion_comercial', 1, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @avance AND RoleCodigo = N'supervisor_inversion')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@avance, N'supervisor_inversion', 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @funnel AND RoleCodigo = N'direccion_comercial')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@funnel, N'direccion_comercial', 1, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @funnel AND RoleCodigo = N'supervisor_inversion')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@funnel, N'supervisor_inversion', 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @control AND RoleCodigo = N'direccion_comercial')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@control, N'direccion_comercial', 1, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @control AND RoleCodigo = N'gerencia_general')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@control, N'gerencia_general', 1, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM dbo.ReporteRoles WHERE ReporteId = @control AND RoleCodigo = N'supervisor_inversion')
    INSERT INTO dbo.ReporteRoles (ReporteId, RoleCodigo, Activo, CreadoFecha) VALUES (@control, N'supervisor_inversion', 1, SYSUTCDATETIME());
GO

/* ------------------------------------------------------------------
   Contactos de demostración, todos asignados al usuario de desarrollo
   (ver DEV_USER_OID en local.settings.json). El CHECK
   CK_Contactos_Identificacion_Coherente exige:
     NATURAL  -> Nombres + Apellidos, RazonSocial NULL
     JURIDICA -> RazonSocial, Nombres/Apellidos NULL
   ------------------------------------------------------------------ */
/* Nota: el GUID va literal en cada INSERT. Un DECLARE no sobrevive a un
   GO, y sqlcmd ejecuta cada batch por separado. */
IF NOT EXISTS (SELECT 1 FROM dbo.Contactos WHERE NumeroDocumento = N'45678912')
    INSERT INTO dbo.Contactos
        (TipoContacto, TipoDocumento, NumeroDocumento, Nombres, Apellidos, RazonSocial,
         FechaNacimiento, Sexo, EstadoCivil, Nacionalidad, PaisResidencia, EsPep,
         EstadoContacto, Celular, Correo, TelefonoFijo, ResponsableId,
         CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
    VALUES
        (N'NATURAL', N'DNI', N'45678912', N'Ana Lucía', N'Torres Vega', NULL,
         '1990-04-12', N'FEMENINO', N'SOLTERO', N'PERUANA', N'PERU', 0,
         N'ACTIVO', N'987654321', N'ana.torres@example.com', NULL, '11111111-1111-1111-1111-111111111111',
         SYSUTCDATETIME(), N'Usuario Desarrollo', N'dev@maziflow.local', '11111111-1111-1111-1111-111111111111');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Contactos WHERE NumeroDocumento = N'41234567')
    INSERT INTO dbo.Contactos
        (TipoContacto, TipoDocumento, NumeroDocumento, Nombres, Apellidos, RazonSocial,
         FechaNacimiento, Sexo, EstadoCivil, Nacionalidad, PaisResidencia, EsPep,
         EstadoContacto, Celular, Correo, TelefonoFijo, ResponsableId,
         CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
    VALUES
        (N'NATURAL', N'DNI', N'41234567', N'Carlos', N'Mendoza Ríos', NULL,
         '1985-11-02', N'MASCULINO', N'CASADO', N'PERUANA', N'PERU', 1,
         N'ACTIVO', N'912345678', N'carlos.mendoza@example.com', N'014567890', '11111111-1111-1111-1111-111111111111',
         SYSUTCDATETIME(), N'Usuario Desarrollo', N'dev@maziflow.local', '11111111-1111-1111-1111-111111111111');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Contactos WHERE NumeroDocumento = N'20613067818')
    INSERT INTO dbo.Contactos
        (TipoContacto, TipoDocumento, NumeroDocumento, Nombres, Apellidos, RazonSocial,
         FechaNacimiento, Sexo, EstadoCivil, Nacionalidad, PaisResidencia, EsPep,
         EstadoContacto, Celular, Correo, TelefonoFijo, ResponsableId,
         CreadoFecha, CreadoNombre, CreadoCorreo, CreadoId)
    VALUES
        (N'JURIDICA', N'RUC', N'20613067818', NULL, NULL, N'Capacity Perú S.A.C.',
         NULL, NULL, NULL, N'PERUANA', N'PERU', 0,
         N'ACTIVO', N'999888777', N'contacto@capacity.example', N'016789012', '11111111-1111-1111-1111-111111111111',
         SYSUTCDATETIME(), N'Usuario Desarrollo', N'dev@maziflow.local', '11111111-1111-1111-1111-111111111111');
GO
