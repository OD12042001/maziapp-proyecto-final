/* ------------------------------------------------------------------
   Mazi Flow - Esquema local para SQL Server 2022 (Docker).
   Generado desde mazi-sgri.sql (volcado de Azure SQL).
   Se eliminan las clausulas exclusivas de Azure SQL:
     CREATE DATABASE ... (EDITION/SERVICE_OBJECTIVE/MAXSIZE/
     CATALOG_COLLATION/LEDGER), ALTER DATABASE ... (COMPATIBILITY_LEVEL
     170, ENCRYPTION, QUERY_STORE, READ_WRITE).
   El resto del DDL es T-SQL estandar y se conserva sin cambios.
   ------------------------------------------------------------------ */
IF DB_ID(N'mazi_sqri_qa') IS NULL
BEGIN
    CREATE DATABASE [mazi_sqri_qa];
END
GO
USE [mazi_sqri_qa];
GO
/****** Object:  Table [dbo].[Actividades]    Script Date: 8/10/2026 16:16:15 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Actividades](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ContactoId] [int] NOT NULL,
	[TipoActividad] [nvarchar](20) NOT NULL,
	[Descripcion] [nvarchar](1000) NULL,
	[FechaActividad] [datetime2](7) NOT NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[CreadoNombre] [nvarchar](200) NULL,
 CONSTRAINT [PK_Actividades] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CatalogoCiiu]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CatalogoCiiu](
	[CiiuId] [int] IDENTITY(1,1) NOT NULL,
	[Codigo] [varchar](10) NOT NULL,
	[Descripcion] [nvarchar](300) NOT NULL,
	[Activo] [bit] NOT NULL,
 CONSTRAINT [PK_CatalogoCiiu] PRIMARY KEY CLUSTERED 
(
	[CiiuId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContactoActividad]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContactoActividad](
	[ContactoId] [int] NOT NULL,
	[GradoInstruccion] [nvarchar](20) NULL,
	[ProfesionOcupacion] [nvarchar](150) NULL,
	[CiiuId] [int] NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoNombre] [nvarchar](200) NULL,
	[CreadoCorreo] [nvarchar](150) NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoNombre] [nvarchar](200) NULL,
	[ActualizadoCorreo] [nvarchar](150) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_ContactoActividad] PRIMARY KEY CLUSTERED 
(
	[ContactoId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContactoRepresentante]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContactoRepresentante](
	[ContactoRepresentanteId] [int] IDENTITY(1,1) NOT NULL,
	[ContactoId] [int] NOT NULL,
	[RepresentanteId] [int] NOT NULL,
	[Cargo] [nvarchar](100) NOT NULL,
	[Activo] [bit] NOT NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_ContactoRepresentante] PRIMARY KEY CLUSTERED 
(
	[ContactoRepresentanteId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Contactos]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Contactos](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TipoContacto] [nvarchar](20) NOT NULL,
	[TipoDocumento] [nvarchar](20) NOT NULL,
	[NumeroDocumento] [nvarchar](20) NOT NULL,
	[Nombres] [nvarchar](120) NULL,
	[Apellidos] [nvarchar](120) NULL,
	[RazonSocial] [nvarchar](200) NULL,
	[FechaNacimiento] [date] NULL,
	[Sexo] [nvarchar](10) NULL,
	[EstadoCivil] [nvarchar](30) NULL,
	[Nacionalidad] [nvarchar](60) NULL,
	[PaisResidencia] [nvarchar](60) NULL,
	[EsPep] [bit] NOT NULL,
	[EstadoContacto] [nvarchar](20) NOT NULL,
	[Celular] [nvarchar](20) NULL,
	[Correo] [nvarchar](150) NULL,
	[TelefonoFijo] [nvarchar](20) NULL,
	[ResponsableId] [uniqueidentifier] NOT NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoNombre] [nvarchar](200) NULL,
	[CreadoCorreo] [nvarchar](150) NULL,
	[CreadoId] [uniqueidentifier] NOT NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoNombre] [nvarchar](200) NULL,
	[ActualizadoCorreo] [nvarchar](150) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_Contactos] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContactoTrabajoDependiente]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContactoTrabajoDependiente](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ContactoId] [int] NOT NULL,
	[EmpresaContactoId] [int] NULL,
	[EmpresaNombreLibre] [nvarchar](200) NULL,
	[Cargo] [nvarchar](100) NOT NULL,
	[Desde] [date] NOT NULL,
	[Hasta] [date] NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoNombre] [nvarchar](200) NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[Activo] [bit] NOT NULL,
	[FechaModificacion] [datetime2](7) NULL,
 CONSTRAINT [PK_ContactoTrabajoDependiente] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Departamentos]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Departamentos](
	[IdDepartamento] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [varchar](100) NOT NULL,
	[Activo] [bit] NOT NULL,
 CONSTRAINT [PK_Departamentos] PRIMARY KEY CLUSTERED 
(
	[IdDepartamento] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Direcciones]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Direcciones](
	[IdDireccion] [int] IDENTITY(1,1) NOT NULL,
	[IdContacto] [int] NOT NULL,
	[IdDistrito] [int] NOT NULL,
	[Calle] [varchar](250) NOT NULL,
	[Numero] [varchar](30) NOT NULL,
	[DepartamentoInterior] [varchar](100) NULL,
	[Activo] [bit] NOT NULL,
	[FechaCreacion] [datetime2](7) NOT NULL,
	[FechaModificacion] [datetime2](7) NULL,
 CONSTRAINT [PK_Direcciones] PRIMARY KEY CLUSTERED 
(
	[IdDireccion] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Distritos]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Distritos](
	[IdDistrito] [int] IDENTITY(1,1) NOT NULL,
	[IdProvincia] [int] NOT NULL,
	[Nombre] [varchar](150) NOT NULL,
	[Activo] [bit] NOT NULL,
 CONSTRAINT [PK_Distritos] PRIMARY KEY CLUSTERED 
(
	[IdDistrito] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notas]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notas](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ContactoId] [int] NOT NULL,
	[Contenido] [nvarchar](2000) NOT NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[CreadoNombre] [nvarchar](200) NULL,
 CONSTRAINT [PK_Notas] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Provincias]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Provincias](
	[IdProvincia] [int] IDENTITY(1,1) NOT NULL,
	[IdDepartamento] [int] NOT NULL,
	[Nombre] [varchar](100) NOT NULL,
	[Activo] [bit] NOT NULL,
 CONSTRAINT [PK_Provincias] PRIMARY KEY CLUSTERED 
(
	[IdProvincia] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReporteRoles]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReporteRoles](
	[ReporteRolId] [int] IDENTITY(1,1) NOT NULL,
	[ReporteId] [int] NOT NULL,
	[RoleCodigo] [nvarchar](50) NOT NULL,
	[Activo] [bit] NOT NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_ReporteRoles] PRIMARY KEY CLUSTERED 
(
	[ReporteRolId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Reportes]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Reportes](
	[ReporteId] [int] IDENTITY(1,1) NOT NULL,
	[Clave] [nvarchar](50) NOT NULL,
	[Nombre] [nvarchar](150) NOT NULL,
	[Activo] [bit] NOT NULL,
	[Descripcion] [nvarchar](300) NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoId] [uniqueidentifier] NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_Reportes] PRIMARY KEY CLUSTERED 
(
	[ReporteId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Representantes]    Script Date: 8/10/2026 16:16:19 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Representantes](
	[RepresentanteId] [int] IDENTITY(1,1) NOT NULL,
	[TipoDocumento] [nvarchar](20) NOT NULL,
	[NumeroDocumento] [nvarchar](20) NOT NULL,
	[Nombres] [nvarchar](120) NOT NULL,
	[Apellidos] [nvarchar](120) NOT NULL,
	[Celular] [nvarchar](20) NULL,
	[Correo] [nvarchar](150) NULL,
	[CreadoFecha] [datetime2](7) NOT NULL,
	[CreadoNombre] [nvarchar](200) NULL,
	[CreadoCorreo] [nvarchar](150) NULL,
	[CreadoId] [uniqueidentifier] NOT NULL,
	[ActualizadoFecha] [datetime2](7) NULL,
	[ActualizadoNombre] [nvarchar](200) NULL,
	[ActualizadoCorreo] [nvarchar](150) NULL,
	[ActualizadoId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_Representantes] PRIMARY KEY CLUSTERED 
(
	[RepresentanteId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
INSERT [dbo].[ContactoActividad] ([ContactoId], [GradoInstruccion], [ProfesionOcupacion], [CiiuId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (21, N'TECNICO', N'SISTEMAS', NULL, CAST(N'2026-09-04T04:22:13.2423729' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-11T05:00:58.8278568' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
GO
SET IDENTITY_INSERT [dbo].[ContactoRepresentante] ON 

INSERT [dbo].[ContactoRepresentante] ([ContactoRepresentanteId], [ContactoId], [RepresentanteId], [Cargo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (1, 23, 1, N'sistemas', 0, CAST(N'2026-08-31T03:30:29.9791738' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-10T04:10:45.2550890' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[ContactoRepresentante] ([ContactoRepresentanteId], [ContactoId], [RepresentanteId], [Cargo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (2, 23, 2, N'representante', 0, CAST(N'2026-09-01T03:29:25.7829047' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-02T00:54:08.2477843' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[ContactoRepresentante] ([ContactoRepresentanteId], [ContactoId], [RepresentanteId], [Cargo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (3, 23, 3, N'Gerente', 1, CAST(N'2026-09-02T00:54:35.9222048' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-10T04:10:50.0262309' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[ContactoRepresentante] ([ContactoRepresentanteId], [ContactoId], [RepresentanteId], [Cargo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (4, 23, 4, N'Gerente', 0, CAST(N'2026-09-10T03:50:03.9672580' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-10T03:50:30.2546585' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[ContactoRepresentante] ([ContactoRepresentanteId], [ContactoId], [RepresentanteId], [Cargo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (5, 23, 5, N'gerente', 1, CAST(N'2026-09-11T00:41:21.7591622' AS DateTime2), N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL)
SET IDENTITY_INSERT [dbo].[ContactoRepresentante] OFF
GO
SET IDENTITY_INSERT [dbo].[Contactos] ON 

INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (1, N'NATURAL', N'DNI', N'47541236', N'joel daniel', N'peña julca', NULL, NULL, N'FEMENINO', N'CASADO', N'PERUANO', N'brazil', 1, N'ACTIVO', N'923510660', N'soporte@crecefinanzas.pe', NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-25T00:34:55.5334221' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T01:00:20.3521452' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (2, N'JURIDICA', N'RUC', N'10475412368', NULL, NULL, N'Soporte TI', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-25T00:52:36.5966757' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (4, N'NATURAL', N'DNI', N'47541238', N'joel', N'peña', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'962222222', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-26T04:06:17.0917905' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (6, N'NATURAL', N'DNI', N'47541239', N'luis', N'gallardo', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T00:59:45.6050486' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (7, N'JURIDICA', N'RUC', N'10475412369', NULL, NULL, N'ABC CAPITAL', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'92351060', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T01:00:37.6817236' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (8, N'NATURAL', N'DNI', N'47541288', N'Maria', N'Cruz', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'9236510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T01:12:27.9969731' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (9, N'NATURAL', N'DNI', N'47541769', N'Jordy', N'Barriga', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T01:22:40.2775454' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (11, N'NATURAL', N'DNI', N'47541277', N'Pool', N'Arana', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T01:31:50.1012435' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (12, N'NATURAL', N'DNI', N'47541158', N'lucho', N'perez', NULL, NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'9235100660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T01:39:45.1511208' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (13, N'JURIDICA', N'RUC', N'10475412361', NULL, NULL, N'CAPACITY', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T02:02:08.7724515' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (14, N'NATURAL', N'CE', N'47541299', N'Carmen', N'peña', NULL, NULL, N'FEMENINO', N'SOLTERO', N'PERUANO', N'PERU', 0, N'ACTIVO', N'92510660', N'soporte@crecefinanzas.pe', NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T02:08:14.0792868' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T00:57:52.2277734' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (16, N'JURIDICA', N'RUC', N'10475412366', NULL, NULL, N'ABCD', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-27T02:10:15.7738130' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (17, N'JURIDICA', N'RUC', N'10475412398', NULL, NULL, N'MAZI', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'999999', NULL, NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T00:15:35.9517388' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (18, N'NATURAL', N'DNI', N'47541155', N'Carlos', N'tevez', NULL, CAST(N'2006-08-02' AS Date), N'MASCULINO', N'CASADO', N'PERUANO', N'España', 0, N'ACTIVO', N'923510660', N'starcrinea@gmail.com', NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T01:21:59.0750305' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T01:23:21.8388630' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (21, N'NATURAL', N'DNI', N'47541235', N'joelll', N'peñaA', NULL, CAST(N'2007-08-09' AS Date), N'MASCULINO', N'SOLTERO', N'Peruan', N'Peru', 0, N'ACTIVO', N'92351068', N'starcrinea@gmail.com', NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T02:45:38.5855461' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-11T04:50:35.9881762' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[Contactos] ([Id], [TipoContacto], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [RazonSocial], [FechaNacimiento], [Sexo], [EstadoCivil], [Nacionalidad], [PaisResidencia], [EsPep], [EstadoContacto], [Celular], [Correo], [TelefonoFijo], [ResponsableId], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (23, N'JURIDICA', N'RUC', N'10475412367', NULL, NULL, N'CRECEEEt', NULL, NULL, NULL, NULL, NULL, 0, N'ACTIVO', N'923510660', N'soporte@crecefinanzas.pe', NULL, N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-08-28T02:47:10.9539529' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-11T00:40:46.9829769' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
SET IDENTITY_INSERT [dbo].[Contactos] OFF
GO
SET IDENTITY_INSERT [dbo].[ContactoTrabajoDependiente] ON 

INSERT [dbo].[ContactoTrabajoDependiente] ([Id], [ContactoId], [EmpresaContactoId], [EmpresaNombreLibre], [Cargo], [Desde], [Hasta], [CreadoFecha], [CreadoNombre], [CreadoId], [Activo], [FechaModificacion]) VALUES (1, 21, NULL, N'ABC CAPITALL', N'FINANZAS', CAST(N'2020-01-01' AS Date), CAST(N'2022-01-01' AS Date), CAST(N'2026-09-05T00:41:27.5293777' AS DateTime2), N'Michael Enriquez', N'c5f70284-66e8-4a20-b314-8ae2edc81779', 1, NULL)
INSERT [dbo].[ContactoTrabajoDependiente] ([Id], [ContactoId], [EmpresaContactoId], [EmpresaNombreLibre], [Cargo], [Desde], [Hasta], [CreadoFecha], [CreadoNombre], [CreadoId], [Activo], [FechaModificacion]) VALUES (2, 21, NULL, N'Capacity', N'Tecnico', CAST(N'2010-10-01' AS Date), CAST(N'2026-09-09' AS Date), CAST(N'2026-09-05T02:57:50.1220083' AS DateTime2), N'Michael Enriquez', N'c5f70284-66e8-4a20-b314-8ae2edc81779', 1, CAST(N'2026-09-11T05:00:46.5273558' AS DateTime2))
INSERT [dbo].[ContactoTrabajoDependiente] ([Id], [ContactoId], [EmpresaContactoId], [EmpresaNombreLibre], [Cargo], [Desde], [Hasta], [CreadoFecha], [CreadoNombre], [CreadoId], [Activo], [FechaModificacion]) VALUES (3, 21, NULL, N'ABCCC', N'Tecnico', CAST(N'2010-10-01' AS Date), NULL, CAST(N'2026-09-10T03:45:09.6220666' AS DateTime2), N'Michael Enriquez', N'c5f70284-66e8-4a20-b314-8ae2edc81779', 0, CAST(N'2026-09-11T05:00:37.6813182' AS DateTime2))
INSERT [dbo].[ContactoTrabajoDependiente] ([Id], [ContactoId], [EmpresaContactoId], [EmpresaNombreLibre], [Cargo], [Desde], [Hasta], [CreadoFecha], [CreadoNombre], [CreadoId], [Activo], [FechaModificacion]) VALUES (4, 21, NULL, N'CISCOI', N'sistemas', CAST(N'2019-01-02' AS Date), CAST(N'2020-01-02' AS Date), CAST(N'2026-09-11T05:01:22.5424075' AS DateTime2), N'Michael Enriquez', N'c5f70284-66e8-4a20-b314-8ae2edc81779', 1, NULL)
SET IDENTITY_INSERT [dbo].[ContactoTrabajoDependiente] OFF
GO
SET IDENTITY_INSERT [dbo].[Departamentos] ON 

INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (1, N'AMAZONAS', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (2, N'ANCASH', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (3, N'APURIMAC', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (4, N'AREQUIPA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (5, N'AYACUCHO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (6, N'CAJAMARCA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (7, N'CALLAO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (8, N'CUSCO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (9, N'HUANCAVELICA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (10, N'HUANUCO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (11, N'ICA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (12, N'JUNIN', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (13, N'LA LIBERTAD', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (14, N'LAMBAYEQUE', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (15, N'LIMA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (16, N'LORETO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (17, N'MADRE DE DIOS', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (18, N'MOQUEGUA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (19, N'PASCO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (20, N'PIURA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (21, N'PUNO', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (22, N'SAN MARTIN', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (23, N'TACNA', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (24, N'TUMBES', 1)
INSERT [dbo].[Departamentos] ([IdDepartamento], [Nombre], [Activo]) VALUES (25, N'UCAYALI', 1)
SET IDENTITY_INSERT [dbo].[Departamentos] OFF
GO
SET IDENTITY_INSERT [dbo].[Direcciones] ON 

INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (1, 23, 1308, N'callle', N'33', N'23', 0, CAST(N'2026-09-01T00:54:17.3806647' AS DateTime2), CAST(N'2026-09-01T01:02:20.6999922' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (2, 23, 1080, N'calle de test', N'25', N'20', 0, CAST(N'2026-09-01T01:01:37.2451265' AS DateTime2), CAST(N'2026-09-03T23:43:44.8768273' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (3, 23, 696, N'barracones', N'10', N'10', 0, CAST(N'2026-09-02T00:53:48.5148260' AS DateTime2), CAST(N'2026-09-11T00:40:02.0208739' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (4, 21, 1323, N'test', N'55', N'4', 0, CAST(N'2026-09-10T03:31:31.9345238' AS DateTime2), CAST(N'2026-09-10T03:33:04.8952798' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (5, 21, 1308, N'jiron risso', N'44', N'2', 0, CAST(N'2026-09-10T03:32:15.2823668' AS DateTime2), CAST(N'2026-09-10T03:44:46.7065461' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (6, 21, 1308, N'ertre', N'44', N'4', 0, CAST(N'2026-09-10T03:44:17.9339506' AS DateTime2), CAST(N'2026-09-10T03:44:50.0141759' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (7, 21, 336, N'SDVSD', N'3', N'3', 0, CAST(N'2026-09-10T03:45:53.4025457' AS DateTime2), CAST(N'2026-09-10T03:56:55.6354274' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (8, 23, 1307, N'fsdfsd', N'343', N'4', 1, CAST(N'2026-09-10T03:51:01.0508204' AS DateTime2), NULL)
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (9, 21, 1307, N'erger', N'4254', N'10', 1, CAST(N'2026-09-10T04:11:43.1718966' AS DateTime2), NULL)
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (10, 21, 1324, N'LAS MELLEAS', N'55', N'10', 1, CAST(N'2026-09-11T00:25:14.6528515' AS DateTime2), CAST(N'2026-09-11T00:45:00.0410688' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (11, 21, 1372, N'FGFD', N'33', N'4', 0, CAST(N'2026-09-11T00:26:28.3617861' AS DateTime2), CAST(N'2026-09-11T00:26:33.0196949' AS DateTime2))
INSERT [dbo].[Direcciones] ([IdDireccion], [IdContacto], [IdDistrito], [Calle], [Numero], [DepartamentoInterior], [Activo], [FechaCreacion], [FechaModificacion]) VALUES (12, 23, 1297, N'ttt', N'4', N'7', 1, CAST(N'2026-09-11T00:40:43.3024587' AS DateTime2), NULL)
SET IDENTITY_INSERT [dbo].[Direcciones] OFF
GO
SET IDENTITY_INSERT [dbo].[Distritos] ON 

INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1, 1, N'CHACHAPOYAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (2, 1, N'ASUNCION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (3, 1, N'BALSAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (4, 1, N'CHETO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (5, 1, N'CHILIQUIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (6, 1, N'CHUQUIBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (7, 1, N'GRANADA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (8, 1, N'HUANCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (9, 1, N'LA JALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (10, 1, N'LEIMEBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (11, 1, N'LEVANTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (12, 1, N'MAGDALENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (13, 1, N'MARISCAL CASTILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (14, 1, N'MOLINOPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (15, 1, N'MONTEVIDEO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (16, 1, N'OLLEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (17, 1, N'QUINJALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (18, 1, N'SAN FRANCISCO DE DAGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (19, 1, N'SAN ISIDRO DE MAINO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (20, 1, N'SOLOCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (21, 1, N'SONCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (22, 2, N'BAGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (23, 2, N'ARAMANGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (24, 2, N'COPALLIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (25, 2, N'EL PARCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (26, 2, N'IMAZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (27, 2, N'LA PECA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (28, 3, N'JUMBILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (29, 3, N'CHISQUILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (30, 3, N'CHURUJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (31, 3, N'COROSHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (32, 3, N'CUISPES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (33, 3, N'FLORIDA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (34, 3, N'JAZAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (35, 3, N'RECTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (36, 3, N'SAN CARLOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (37, 3, N'SHIPASBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (38, 3, N'VALERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (39, 3, N'YAMBRASBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (40, 4, N'NIEVA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (41, 4, N'EL CENEPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (42, 4, N'RIO SANTIAGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (43, 5, N'LAMUD', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (44, 5, N'CAMPORREDONDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (45, 5, N'COCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (46, 5, N'COLCAMAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (47, 5, N'CONILA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (48, 5, N'INGUILPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (49, 5, N'LONGUITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (50, 5, N'LONYA CHICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (51, 5, N'LUYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (52, 5, N'LUYA VIEJO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (53, 5, N'MARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (54, 5, N'OCALLI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (55, 5, N'OCUMAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (56, 5, N'PISUQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (57, 5, N'PROVIDENCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (58, 5, N'SAN CRISTOBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (59, 5, N'SAN FRANCISCO DEL YESO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (60, 5, N'SAN JERONIMO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (61, 5, N'SAN JUAN DE LOPECANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (62, 5, N'SANTA CATALINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (63, 5, N'SANTO TOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (64, 5, N'TINGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (65, 5, N'TRITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (66, 6, N'SAN NICOLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (67, 6, N'CHIRIMOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (68, 6, N'COCHAMAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (69, 6, N'HUAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (70, 6, N'LIMABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (71, 6, N'LONGAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (72, 6, N'MARISCAL BENAVIDES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (73, 6, N'MILPUC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (74, 6, N'OMIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (75, 6, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (76, 6, N'TOTORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (77, 6, N'VISTA ALEGRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (78, 7, N'BAGUA GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (79, 7, N'CAJARURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (80, 7, N'CUMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (81, 7, N'EL MILAGRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (82, 7, N'JAMALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (83, 7, N'LONYA GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (84, 7, N'YAMON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (85, 8, N'HUARAZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (86, 8, N'COCHABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (87, 8, N'COLCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (88, 8, N'HUANCHAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (89, 8, N'INDEPENDENCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (90, 8, N'JANGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (91, 8, N'LA LIBERTAD', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (92, 8, N'OLLEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (93, 8, N'PAMPAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (94, 8, N'PARIACOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (95, 8, N'PIRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (96, 8, N'TARICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (97, 9, N'AIJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (98, 9, N'CORIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (99, 9, N'HUACLLAN', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (100, 9, N'LA MERCED', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (101, 9, N'SUCCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (102, 10, N'LLAMELLIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (103, 10, N'ACZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (104, 10, N'CHACCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (105, 10, N'CHINGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (106, 10, N'MIRGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (107, 10, N'SAN JUAN DE RONTOY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (108, 11, N'CHACAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (109, 11, N'ACOCHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (110, 12, N'CHIQUIAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (111, 12, N'ABELARDO PARDO LEZAMETA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (112, 12, N'ANTONIO RAYMONDI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (113, 12, N'AQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (114, 12, N'CAJACAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (115, 12, N'CANIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (116, 12, N'COLQUIOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (117, 12, N'HUALLANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (118, 12, N'HUASTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (119, 12, N'HUAYLLACAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (120, 12, N'LA PRIMAVERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (121, 12, N'MANGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (122, 12, N'PACLLON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (123, 12, N'SAN MIGUEL DE CORPANQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (124, 12, N'TICLLOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (125, 13, N'CARHUAZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (126, 13, N'ACOPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (127, 13, N'AMASHCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (128, 13, N'ANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (129, 13, N'ATAQUERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (130, 13, N'MARCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (131, 13, N'PARIAHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (132, 13, N'SAN MIGUEL DE ACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (133, 13, N'SHILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (134, 13, N'TINCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (135, 13, N'YUNGAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (136, 14, N'SAN LUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (137, 14, N'SAN NICOLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (138, 14, N'YAUYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (139, 15, N'CASMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (140, 15, N'BUENA VISTA ALTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (141, 15, N'COMANDANTE NOEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (142, 15, N'YAUTAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (143, 16, N'CORONGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (144, 16, N'ACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (145, 16, N'BAMBAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (146, 16, N'CUSCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (147, 16, N'LA PAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (148, 16, N'YANAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (149, 16, N'YUPAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (150, 17, N'HUARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (151, 17, N'ANRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (152, 17, N'CAJAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (153, 17, N'CHAVIN DE HUANTAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (154, 17, N'HUACACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (155, 17, N'HUACCHIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (156, 17, N'HUACHIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (157, 17, N'HUANTAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (158, 17, N'MASIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (159, 17, N'PAUCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (160, 17, N'PONTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (161, 17, N'RAHUAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (162, 17, N'RAPAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (163, 17, N'SAN MARCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (164, 17, N'SAN PEDRO DE CHANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (165, 17, N'UCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (166, 18, N'HUARMEY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (167, 18, N'COCHAPETI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (168, 18, N'CULEBRAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (169, 18, N'HUAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (170, 18, N'MALVAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (171, 19, N'CARAZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (172, 19, N'HUALLANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (173, 19, N'HUATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (174, 19, N'HUAYLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (175, 19, N'MATO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (176, 19, N'PAMPAROMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (177, 19, N'PUEBLO LIBRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (178, 19, N'SANTA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (179, 19, N'SANTO TORIBIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (180, 19, N'YURACMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (181, 20, N'PISCOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (182, 20, N'CASCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (183, 20, N'ELEAZAR GUZMAN BARRON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (184, 20, N'FIDEL OLIVAS ESCUDERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (185, 20, N'LLAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (186, 20, N'LLUMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (187, 20, N'LUCMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (188, 20, N'MUSGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (189, 21, N'OCROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (190, 21, N'ACAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (191, 21, N'CAJAMARQUILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (192, 21, N'CARHUAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (193, 21, N'COCHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (194, 21, N'CONGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (195, 21, N'LLIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (196, 21, N'SAN CRISTOBAL DE RAJAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (197, 21, N'SAN PEDRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (198, 21, N'SANTIAGO DE CHILCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (199, 22, N'CABANA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (200, 22, N'BOLOGNESI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (201, 22, N'CONCHUCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (202, 22, N'HUACASCHUQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (203, 22, N'HUANDOVAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (204, 22, N'LACABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (205, 22, N'LLAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (206, 22, N'PALLASCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (207, 22, N'PAMPAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (208, 22, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (209, 22, N'TAUCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (210, 23, N'POMABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (211, 23, N'HUAYLLAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (212, 23, N'PAROBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (213, 23, N'QUINUABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (214, 24, N'RECUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (215, 24, N'CATAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (216, 24, N'COTAPARACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (217, 24, N'HUAYLLAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (218, 24, N'LLACLLIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (219, 24, N'MARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (220, 24, N'PAMPAS CHICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (221, 24, N'PARARIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (222, 24, N'TAPACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (223, 24, N'TICAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (224, 25, N'CHIMBOTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (225, 25, N'CACERES DEL PERU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (226, 25, N'COISHCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (227, 25, N'MACATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (228, 25, N'MORO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (229, 25, N'NEPEÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (230, 25, N'SAMANCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (231, 25, N'SANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (232, 25, N'NUEVO CHIMBOTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (233, 26, N'SIHUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (234, 26, N'ACOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (235, 26, N'ALFONSO UGARTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (236, 26, N'CASHAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (237, 26, N'CHINGALPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (238, 26, N'HUAYLLABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (239, 26, N'QUICHES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (240, 26, N'RAGASH', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (241, 26, N'SAN JUAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (242, 26, N'SICSIBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (243, 27, N'YUNGAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (244, 27, N'CASCAPARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (245, 27, N'MANCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (246, 27, N'MATACOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (247, 27, N'QUILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (248, 27, N'RANRAHIRCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (249, 27, N'SHUPLUY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (250, 27, N'YANAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (251, 28, N'ABANCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (252, 28, N'CHACOCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (253, 28, N'CIRCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (254, 28, N'CURAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (255, 28, N'HUANIPACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (256, 28, N'LAMBRAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (257, 28, N'PICHIRHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (258, 28, N'SAN PEDRO DE CACHORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (259, 28, N'TAMBURCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (260, 29, N'ANDAHUAYLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (261, 29, N'ANDARAPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (262, 29, N'CHIARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (263, 29, N'HUANCARAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (264, 29, N'HUANCARAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (265, 29, N'HUAYANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (266, 29, N'KISHUARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (267, 29, N'PACOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (268, 29, N'PACUCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (269, 29, N'PAMPACHIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (270, 29, N'POMACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (271, 29, N'SAN ANTONIO DE CACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (272, 29, N'SAN JERONIMO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (273, 29, N'SAN MIGUEL DE CHACCRAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (274, 29, N'SANTA MARIA DE CHICMO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (275, 29, N'TALAVERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (276, 29, N'TUMAY HUARACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (277, 29, N'TURPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (278, 29, N'KAQUIABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (279, 29, N'JOSE MARIA ARGUEDAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (280, 30, N'ANTABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (281, 30, N'EL ORO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (282, 30, N'HUAQUIRCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (283, 30, N'JUAN ESPINOZA MEDRANO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (284, 30, N'OROPESA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (285, 30, N'PACHACONAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (286, 30, N'SABAINO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (287, 31, N'CHALHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (288, 31, N'CAPAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (289, 31, N'CARAYBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (290, 31, N'CHAPIMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (291, 31, N'COLCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (292, 31, N'COTARUSE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (293, 31, N'HUAYLLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (294, 31, N'JUSTO APU SAHUARAURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (295, 31, N'LUCRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (296, 31, N'POCOHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (297, 31, N'SAN JUAN DE CHACÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (298, 31, N'SAÑAYCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (299, 31, N'SORAYA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (300, 31, N'TAPAIRIHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (301, 31, N'TINTAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (302, 31, N'TORAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (303, 31, N'YANACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (304, 32, N'TAMBOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (305, 32, N'COTABAMBAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (306, 32, N'COYLLURQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (307, 32, N'HAQUIRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (308, 32, N'MARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (309, 32, N'CHALLHUAHUACHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (310, 33, N'CHINCHEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (311, 33, N'ANCO-HUALLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (312, 33, N'COCHARCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (313, 33, N'HUACCANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (314, 33, N'OCOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (315, 33, N'ONGOY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (316, 33, N'URANMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (317, 33, N'RANRACANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (318, 33, N'ROCCHACC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (319, 33, N'EL PORVENIR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (320, 33, N'LOS CHANKAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (321, 33, N'AHUAYRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (322, 34, N'CHUQUIBAMBILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (323, 34, N'CURPAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (324, 34, N'GAMARRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (325, 34, N'HUAYLLATI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (326, 34, N'MAMARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (327, 34, N'MICAELA BASTIDAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (328, 34, N'PATAYPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (329, 34, N'PROGRESO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (330, 34, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (331, 34, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (332, 34, N'TURPAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (333, 34, N'VILCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (334, 34, N'VIRUNDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (335, 34, N'CURASCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (336, 35, N'AREQUIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (337, 35, N'ALTO SELVA ALEGRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (338, 35, N'CAYMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (339, 35, N'CERRO COLORADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (340, 35, N'CHARACATO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (341, 35, N'CHIGUATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (342, 35, N'JACOBO HUNTER', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (343, 35, N'LA JOYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (344, 35, N'MARIANO MELGAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (345, 35, N'MIRAFLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (346, 35, N'MOLLEBAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (347, 35, N'PAUCARPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (348, 35, N'POCSI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (349, 35, N'POLOBAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (350, 35, N'QUEQUEÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (351, 35, N'SABANDIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (352, 35, N'SACHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (353, 35, N'SAN JUAN DE SIGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (354, 35, N'SAN JUAN DE TARUCANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (355, 35, N'SANTA ISABEL DE SIGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (356, 35, N'SANTA RITA DE SIGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (357, 35, N'SOCABAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (358, 35, N'TIABAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (359, 35, N'UCHUMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (360, 35, N'VITOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (361, 35, N'YANAHUARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (362, 35, N'YARABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (363, 35, N'YURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (364, 35, N'JOSE LUIS BUSTAMANTE Y RIVERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (365, 36, N'CAMANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (366, 36, N'JOSE MARIA QUIMPER', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (367, 36, N'MARIANO NICOLAS VALCARCEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (368, 36, N'MARISCAL CACERES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (369, 36, N'NICOLAS DE PIEROLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (370, 36, N'OCOÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (371, 36, N'QUILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (372, 36, N'SAMUEL PASTOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (373, 37, N'CARAVELI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (374, 37, N'ACARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (375, 37, N'ATICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (376, 37, N'ATIQUIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (377, 37, N'BELLA UNION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (378, 37, N'CAHUACHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (379, 37, N'CHALA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (380, 37, N'CHAPARRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (381, 37, N'HUANUHUANU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (382, 37, N'JAQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (383, 37, N'LOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (384, 37, N'QUICACHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (385, 37, N'YAUCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (386, 38, N'APLAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (387, 38, N'ANDAGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (388, 38, N'AYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (389, 38, N'CHACHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (390, 38, N'CHILCAYMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (391, 38, N'CHOCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (392, 38, N'HUANCARQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (393, 38, N'MACHAGUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (394, 38, N'ORCOPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (395, 38, N'PAMPACOLCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (396, 38, N'TIPAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (397, 38, N'UÑON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (398, 38, N'URACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (399, 38, N'VIRACO', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (400, 39, N'CHIVAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (401, 39, N'ACHOMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (402, 39, N'CABANACONDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (403, 39, N'CALLALLI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (404, 39, N'CAYLLOMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (405, 39, N'COPORAQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (406, 39, N'HUAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (407, 39, N'HUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (408, 39, N'ICHUPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (409, 39, N'LARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (410, 39, N'LLUTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (411, 39, N'MACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (412, 39, N'MADRIGAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (413, 39, N'SAN ANTONIO DE CHUCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (414, 39, N'SIBAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (415, 39, N'TAPAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (416, 39, N'TISCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (417, 39, N'TUTI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (418, 39, N'YANQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (419, 39, N'MAJES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (420, 40, N'CHUQUIBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (421, 40, N'ANDARAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (422, 40, N'CAYARANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (423, 40, N'CHICHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (424, 40, N'IRAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (425, 40, N'RIO GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (426, 40, N'SALAMANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (427, 40, N'YANAQUIHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (428, 41, N'MOLLENDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (429, 41, N'COCACHACRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (430, 41, N'DEAN VALDIVIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (431, 41, N'ISLAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (432, 41, N'MEJIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (433, 41, N'PUNTA DE BOMBON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (434, 42, N'COTAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (435, 42, N'ALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (436, 42, N'CHARCANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (437, 42, N'HUAYNACOTAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (438, 42, N'PAMPAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (439, 42, N'PUYCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (440, 42, N'QUECHUALLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (441, 42, N'SAYLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (442, 42, N'TAURIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (443, 42, N'TOMEPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (444, 42, N'TORO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (445, 43, N'AYACUCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (446, 43, N'ACOCRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (447, 43, N'ACOS VINCHOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (448, 43, N'CARMEN ALTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (449, 43, N'CHIARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (450, 43, N'OCROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (451, 43, N'PACAYCASA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (452, 43, N'QUINUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (453, 43, N'SAN JOSE DE TICLLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (454, 43, N'SAN JUAN BAUTISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (455, 43, N'SANTIAGO DE PISCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (456, 43, N'SOCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (457, 43, N'TAMBILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (458, 43, N'VINCHOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (459, 43, N'JESUS NAZARENO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (460, 43, N'ANDRES AVELINO CACERES DORREGARAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (461, 44, N'CANGALLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (462, 44, N'CHUSCHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (463, 44, N'LOS MOROCHUCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (464, 44, N'MARIA PARADO DE BELLIDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (465, 44, N'PARAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (466, 44, N'TOTOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (467, 45, N'SANCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (468, 45, N'CARAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (469, 45, N'SACSAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (470, 45, N'SANTIAGO DE LUCANAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (471, 46, N'HUANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (472, 46, N'AYAHUANCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (473, 46, N'HUAMANGUILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (474, 46, N'IGUAIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (475, 46, N'LURICOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (476, 46, N'SANTILLANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (477, 46, N'SIVIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (478, 46, N'LLOCHEGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (479, 46, N'CANAYRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (480, 46, N'UCHURACCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (481, 46, N'PUCACOLPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (482, 46, N'CHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (483, 46, N'PUTIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (484, 47, N'SAN MIGUEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (485, 47, N'ANCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (486, 47, N'AYNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (487, 47, N'CHILCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (488, 47, N'CHUNGUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (489, 47, N'LUIS CARRANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (490, 47, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (491, 47, N'TAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (492, 47, N'SAMUGARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (493, 47, N'ANCHIHUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (494, 47, N'ORONCCOY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (495, 47, N'UNION PROGRESO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (496, 47, N'RIO MAGDALENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (497, 47, N'NINABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (498, 47, N'PATIBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (499, 48, N'PUQUIO', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (500, 48, N'AUCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (501, 48, N'CABANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (502, 48, N'CARMEN SALCEDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (503, 48, N'CHAVIÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (504, 48, N'CHIPAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (505, 48, N'HUAC-HUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (506, 48, N'LARAMATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (507, 48, N'LEONCIO PRADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (508, 48, N'LLAUTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (509, 48, N'LUCANAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (510, 48, N'OCAÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (511, 48, N'OTOCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (512, 48, N'SAISA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (513, 48, N'SAN CRISTOBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (514, 48, N'SAN JUAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (515, 48, N'SAN PEDRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (516, 48, N'SAN PEDRO DE PALCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (517, 48, N'SANCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (518, 48, N'SANTA ANA DE HUAYCAHUACHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (519, 48, N'SANTA LUCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (520, 49, N'CORACORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (521, 49, N'CHUMPI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (522, 49, N'CORONEL CASTAÑEDA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (523, 49, N'PACAPAUSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (524, 49, N'PULLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (525, 49, N'PUYUSCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (526, 49, N'SAN FRANCISCO DE RAVACAYCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (527, 49, N'UPAHUACHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (528, 50, N'PAUSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (529, 50, N'COLTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (530, 50, N'CORCULLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (531, 50, N'LAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (532, 50, N'MARCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (533, 50, N'OYOLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (534, 50, N'PARARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (535, 50, N'SAN JAVIER DE ALPABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (536, 50, N'SAN JOSE DE USHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (537, 50, N'SARA SARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (538, 51, N'QUEROBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (539, 51, N'BELEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (540, 51, N'CHALCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (541, 51, N'CHILCAYOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (542, 51, N'HUACAÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (543, 51, N'MORCOLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (544, 51, N'PAICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (545, 51, N'SAN PEDRO DE LARCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (546, 51, N'SAN SALVADOR DE QUIJE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (547, 51, N'SANTIAGO DE PAUCARAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (548, 51, N'SORAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (549, 52, N'HUANCAPI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (550, 52, N'ALCAMENCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (551, 52, N'APONGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (552, 52, N'ASQUIPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (553, 52, N'CANARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (554, 52, N'CAYARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (555, 52, N'COLCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (556, 52, N'HUAMANQUIQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (557, 52, N'HUANCARAYLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (558, 52, N'HUAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (559, 52, N'SARHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (560, 52, N'VILCANCHOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (561, 53, N'VILCAS HUAMAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (562, 53, N'ACCOMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (563, 53, N'CARHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (564, 53, N'CONCEPCION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (565, 53, N'HUAMBALPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (566, 53, N'INDEPENDENCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (567, 53, N'SAURAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (568, 53, N'VISCHONGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (569, 54, N'CAJAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (570, 54, N'ASUNCION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (571, 54, N'CHETILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (572, 54, N'COSPAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (573, 54, N'ENCAÑADA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (574, 54, N'JESUS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (575, 54, N'LLACANORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (576, 54, N'LOS BAÑOS DEL INCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (577, 54, N'MAGDALENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (578, 54, N'MATARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (579, 54, N'NAMORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (580, 54, N'SAN JUAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (581, 55, N'CAJABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (582, 55, N'CACHACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (583, 55, N'CONDEBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (584, 55, N'SITACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (585, 56, N'CELENDIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (586, 56, N'CHUMUCH', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (587, 56, N'CORTEGANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (588, 56, N'HUASMIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (589, 56, N'JORGE CHAVEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (590, 56, N'JOSE GALVEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (591, 56, N'MIGUEL IGLESIAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (592, 56, N'OXAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (593, 56, N'SOROCHUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (594, 56, N'SUCRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (595, 56, N'UTCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (596, 56, N'LA LIBERTAD DE PALLAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (597, 57, N'CHOTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (598, 57, N'ANGUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (599, 57, N'CHADIN', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (600, 57, N'CHIGUIRIP', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (601, 57, N'CHIMBAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (602, 57, N'CHOROPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (603, 57, N'COCHABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (604, 57, N'CONCHAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (605, 57, N'HUAMBOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (606, 57, N'LAJAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (607, 57, N'LLAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (608, 57, N'MIRACOSTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (609, 57, N'PACCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (610, 57, N'PION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (611, 57, N'QUEROCOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (612, 57, N'SAN JUAN DE LICUPIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (613, 57, N'TACABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (614, 57, N'TOCMOCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (615, 57, N'CHALAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (616, 58, N'CONTUMAZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (617, 58, N'CHILETE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (618, 58, N'CUPISNIQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (619, 58, N'GUZMANGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (620, 58, N'SAN BENITO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (621, 58, N'SANTA CRUZ DE TOLEDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (622, 58, N'TANTARICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (623, 58, N'YONAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (624, 59, N'CUTERVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (625, 59, N'CALLAYUC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (626, 59, N'CHOROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (627, 59, N'CUJILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (628, 59, N'LA RAMADA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (629, 59, N'PIMPINGOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (630, 59, N'QUEROCOTILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (631, 59, N'SAN ANDRES DE CUTERVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (632, 59, N'SAN JUAN DE CUTERVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (633, 59, N'SAN LUIS DE LUCMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (634, 59, N'SANTA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (635, 59, N'SANTO DOMINGO DE LA CAPILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (636, 59, N'SANTO TOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (637, 59, N'SOCOTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (638, 59, N'TORIBIO CASANOVA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (639, 60, N'BAMBAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (640, 60, N'CHUGUR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (641, 60, N'HUALGAYOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (642, 61, N'JAEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (643, 61, N'BELLAVISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (644, 61, N'CHONTALI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (645, 61, N'COLASAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (646, 61, N'HUABAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (647, 61, N'LAS PIRIAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (648, 61, N'POMAHUACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (649, 61, N'PUCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (650, 61, N'SALLIQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (651, 61, N'SAN FELIPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (652, 61, N'SAN JOSE DEL ALTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (653, 61, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (654, 62, N'SAN IGNACIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (655, 62, N'CHIRINOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (656, 62, N'HUARANGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (657, 62, N'LA COIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (658, 62, N'NAMBALLE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (659, 62, N'SAN JOSE DE LOURDES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (660, 62, N'TABACONAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (661, 63, N'PEDRO GALVEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (662, 63, N'CHANCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (663, 63, N'EDUARDO VILLANUEVA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (664, 63, N'GREGORIO PITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (665, 63, N'ICHOCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (666, 63, N'JOSE MANUEL QUIROZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (667, 63, N'JOSE SABOGAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (668, 64, N'SAN MIGUEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (669, 64, N'BOLIVAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (670, 64, N'CALQUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (671, 64, N'CATILLUC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (672, 64, N'EL PRADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (673, 64, N'LA FLORIDA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (674, 64, N'LLAPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (675, 64, N'NANCHOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (676, 64, N'NIEPOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (677, 64, N'SAN GREGORIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (678, 64, N'SAN SILVESTRE DE COCHAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (679, 64, N'TONGOD', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (680, 64, N'UNION AGUA BLANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (681, 65, N'SAN PABLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (682, 65, N'SAN BERNARDINO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (683, 65, N'SAN LUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (684, 65, N'TUMBADEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (685, 66, N'SANTA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (686, 66, N'ANDABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (687, 66, N'CATACHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (688, 66, N'CHANCAYBAÑOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (689, 66, N'LA ESPERANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (690, 66, N'NINABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (691, 66, N'PULAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (692, 66, N'SAUCEPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (693, 66, N'SEXI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (694, 66, N'UTICYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (695, 66, N'YAUYUCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (696, 67, N'CALLAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (697, 67, N'BELLAVISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (698, 67, N'CARMEN DE LA LEGUA REYNOSO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (699, 67, N'LA PERLA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (700, 67, N'LA PUNTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (701, 67, N'VENTANILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (702, 67, N'MI PERU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (703, 68, N'CUSCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (704, 68, N'CCORCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (705, 68, N'POROY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (706, 68, N'SAN JERONIMO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (707, 68, N'SAN SEBASTIAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (708, 68, N'SANTIAGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (709, 68, N'SAYLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (710, 68, N'WANCHAQ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (711, 69, N'ACOMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (712, 69, N'ACOPIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (713, 69, N'ACOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (714, 69, N'MOSOC LLACTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (715, 69, N'POMACANCHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (716, 69, N'RONDOCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (717, 69, N'SANGARARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (718, 70, N'ANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (719, 70, N'ANCAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (720, 70, N'CACHIMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (721, 70, N'CHINCHAYPUJIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (722, 70, N'HUAROCONDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (723, 70, N'LIMATAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (724, 70, N'MOLLEPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (725, 70, N'PUCYURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (726, 70, N'ZURITE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (727, 71, N'CALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (728, 71, N'COYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (729, 71, N'LAMAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (730, 71, N'LARES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (731, 71, N'PISAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (732, 71, N'SAN SALVADOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (733, 71, N'TARAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (734, 71, N'YANATILE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (735, 72, N'YANAOCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (736, 72, N'CHECCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (737, 72, N'KUNTURKANKI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (738, 72, N'LANGUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (739, 72, N'LAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (740, 72, N'PAMPAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (741, 72, N'QUEHUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (742, 72, N'TUPAC AMARU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (743, 73, N'SICUANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (744, 73, N'CHECACUPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (745, 73, N'COMBAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (746, 73, N'MARANGANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (747, 73, N'PITUMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (748, 73, N'SAN PABLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (749, 73, N'SAN PEDRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (750, 73, N'TINTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (751, 74, N'SANTO TOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (752, 74, N'CAPACMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (753, 74, N'CHAMACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (754, 74, N'COLQUEMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (755, 74, N'LIVITACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (756, 74, N'LLUSCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (757, 74, N'QUIÑOTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (758, 74, N'VELILLE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (759, 75, N'ESPINAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (760, 75, N'CONDOROMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (761, 75, N'COPORAQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (762, 75, N'OCORURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (763, 75, N'PALLPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (764, 75, N'PICHIGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (765, 75, N'SUYCKUTAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (766, 75, N'ALTO PICHIGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (767, 76, N'SANTA ANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (768, 76, N'ECHARATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (769, 76, N'HUAYOPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (770, 76, N'MARANURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (771, 76, N'OCOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (772, 76, N'QUELLOUNO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (773, 76, N'QUIMBIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (774, 76, N'SANTA TERESA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (775, 76, N'VILCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (776, 76, N'PICHARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (777, 76, N'INKAWASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (778, 76, N'VILLA VIRGEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (779, 76, N'VILLA KINTIARINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (780, 76, N'MEGANTONI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (781, 76, N'KUMPIRUSHIATO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (782, 76, N'CIELO PUNCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (783, 76, N'MANITEA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (784, 76, N'UNION ASHÁNINKA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (785, 77, N'PARURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (786, 77, N'ACCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (787, 77, N'CCAPI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (788, 77, N'COLCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (789, 77, N'HUANOQUITE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (790, 77, N'OMACHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (791, 77, N'PACCARITAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (792, 77, N'PILLPINTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (793, 77, N'YAURISQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (794, 78, N'PAUCARTAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (795, 78, N'CAICAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (796, 78, N'CHALLABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (797, 78, N'COLQUEPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (798, 78, N'HUANCARANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (799, 78, N'KOSÑIPATA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (800, 79, N'URCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (801, 79, N'ANDAHUAYLILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (802, 79, N'CAMANTI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (803, 79, N'CCARHUAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (804, 79, N'CCATCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (805, 79, N'CUSIPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (806, 79, N'HUARO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (807, 79, N'LUCRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (808, 79, N'MARCAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (809, 79, N'OCONGATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (810, 79, N'OROPESA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (811, 79, N'QUIQUIJANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (812, 80, N'URUBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (813, 80, N'CHINCHERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (814, 80, N'HUAYLLABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (815, 80, N'MACHUPICCHU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (816, 80, N'MARAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (817, 80, N'OLLANTAYTAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (818, 80, N'YUCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (819, 81, N'HUANCAVELICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (820, 81, N'ACOBAMBILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (821, 81, N'ACORIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (822, 81, N'CONAYCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (823, 81, N'CUENCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (824, 81, N'HUACHOCOLPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (825, 81, N'HUAYLLAHUARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (826, 81, N'IZCUCHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (827, 81, N'LARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (828, 81, N'MANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (829, 81, N'MARISCAL CACERES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (830, 81, N'MOYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (831, 81, N'NUEVO OCCORO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (832, 81, N'PALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (833, 81, N'PILCHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (834, 81, N'VILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (835, 81, N'YAULI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (836, 81, N'ASCENSION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (837, 81, N'HUANDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (838, 82, N'ACOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (839, 82, N'ANDABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (840, 82, N'ANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (841, 82, N'CAJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (842, 82, N'MARCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (843, 82, N'PAUCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (844, 82, N'POMACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (845, 82, N'ROSARIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (846, 83, N'LIRCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (847, 83, N'ANCHONGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (848, 83, N'CALLANMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (849, 83, N'CCOCHACCASA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (850, 83, N'CHINCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (851, 83, N'CONGALLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (852, 83, N'HUANCA-HUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (853, 83, N'HUAYLLAY GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (854, 83, N'JULCAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (855, 83, N'SAN ANTONIO DE ANTAPARCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (856, 83, N'SANTO TOMAS DE PATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (857, 83, N'SECCLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (858, 84, N'CASTROVIRREYNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (859, 84, N'ARMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (860, 84, N'AURAHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (861, 84, N'CAPILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (862, 84, N'CHUPAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (863, 84, N'COCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (864, 84, N'HUACHOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (865, 84, N'HUAMATAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (866, 84, N'MOLLEPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (867, 84, N'SAN JUAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (868, 84, N'SANTA ANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (869, 84, N'TANTARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (870, 84, N'TICRAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (871, 85, N'CHURCAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (872, 85, N'ANCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (873, 85, N'CHINCHIHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (874, 85, N'EL CARMEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (875, 85, N'LA MERCED', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (876, 85, N'LOCROJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (877, 85, N'PAUCARBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (878, 85, N'SAN MIGUEL DE MAYOCC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (879, 85, N'SAN PEDRO DE CORIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (880, 85, N'PACHAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (881, 85, N'COSME', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (882, 86, N'HUAYTARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (883, 86, N'AYAVI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (884, 86, N'CORDOVA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (885, 86, N'HUAYACUNDO ARMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (886, 86, N'LARAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (887, 86, N'OCOYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (888, 86, N'PILPICHACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (889, 86, N'QUERCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (890, 86, N'QUITO-ARMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (891, 86, N'SAN ANTONIO DE CUSICANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (892, 86, N'SAN FRANCISCO DE SANGAYAICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (893, 86, N'SAN ISIDRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (894, 86, N'SANTIAGO DE CHOCORVOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (895, 86, N'SANTIAGO DE QUIRAHUARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (896, 86, N'SANTO DOMINGO DE CAPILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (897, 86, N'TAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (898, 87, N'PAMPAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (899, 87, N'ACOSTAMBO', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (900, 87, N'ACRAQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (901, 87, N'AHUAYCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (902, 87, N'ANDAYMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (903, 87, N'COCHABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (904, 87, N'COLCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (905, 87, N'DANIEL HERNANDEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (906, 87, N'HUACHOCOLPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (907, 87, N'HUARIBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (908, 87, N'LAMBRAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (909, 87, N'ÑAHUIMPUQUIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (910, 87, N'PAZOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (911, 87, N'PICHOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (912, 87, N'QUICHUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (913, 87, N'QUISHUAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (914, 87, N'ROBLE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (915, 87, N'SALCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (916, 87, N'SALCAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (917, 87, N'SAN MARCOS DE ROCCHAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (918, 87, N'SANTIAGO DE TUCUMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (919, 87, N'SURCUBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (920, 87, N'TINTAY PUNCU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (921, 88, N'AMARILIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (922, 88, N'CHINCHAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (923, 88, N'CHURUBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (924, 88, N'HUANUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (925, 88, N'MARGOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (926, 88, N'PILLCO MARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (927, 88, N'QUISQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (928, 88, N'SAN FRANCISCO DE CAYRAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (929, 88, N'SAN PABLO DE PILLAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (930, 88, N'SAN PEDRO DE CHAULAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (931, 88, N'SANTA MARIA DEL VALLE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (932, 88, N'YACUS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (933, 88, N'YARUMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (934, 89, N'AMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (935, 89, N'CAYNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (936, 89, N'COLPAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (937, 89, N'CONCHAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (938, 89, N'HUACAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (939, 89, N'SAN FRANCISCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (940, 89, N'SAN RAFAEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (941, 89, N'TOMAY KICHWA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (942, 90, N'CHUQUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (943, 90, N'LA UNION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (944, 90, N'MARIAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (945, 90, N'PACHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (946, 90, N'QUIVILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (947, 90, N'RIPAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (948, 90, N'SHUNQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (949, 90, N'SILLAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (950, 90, N'YANAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (951, 91, N'CANCHABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (952, 91, N'COCHABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (953, 91, N'HUACAYBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (954, 91, N'PINRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (955, 92, N'ARANCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (956, 92, N'CHAVIN DE PARIARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (957, 92, N'JACAS GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (958, 92, N'JIRCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (959, 92, N'LLATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (960, 92, N'MIRAFLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (961, 92, N'MONZON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (962, 92, N'PUNCHAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (963, 92, N'PUÑOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (964, 92, N'SINGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (965, 92, N'TANTAMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (966, 93, N'CASTILLO GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (967, 93, N'DANIEL ALOMIAS ROBLES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (968, 93, N'HERMILIO VALDIZAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (969, 93, N'JOSE CRESPO Y CASTILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (970, 93, N'LUYANDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (971, 93, N'MARIANO DAMASO BERAUN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (972, 93, N'PUCAYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (973, 93, N'PUEBLO NUEVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (974, 93, N'RUPA-RUPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (975, 93, N'SANTO DOMINGO DE ANDA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (976, 94, N'CHOLON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (977, 94, N'HUACRACHUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (978, 94, N'LA MORADA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (979, 94, N'SAN BUENAVENTURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (980, 94, N'SANTA ROSA DE ALTO YANAJANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (981, 95, N'CHAGLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (982, 95, N'MOLINO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (983, 95, N'PANAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (984, 95, N'UMARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (985, 96, N'CODO DEL POZUZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (986, 96, N'HONORIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (987, 96, N'PUERTO INCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (988, 96, N'TOURNAVISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (989, 96, N'YUYAPICHIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (990, 97, N'BAÑOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (991, 97, N'JESUS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (992, 97, N'JIVIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (993, 97, N'QUEROPALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (994, 97, N'RONDOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (995, 97, N'SAN FRANCISCO DE ASIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (996, 97, N'SAN MIGUEL DE CAURI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (997, 98, N'APARICIO POMARES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (998, 98, N'CAHUAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (999, 98, N'CHACABAMBA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1000, 98, N'CHAVINILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1001, 98, N'CHORAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1002, 98, N'JACAS CHICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1003, 98, N'OBAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1004, 98, N'PAMPAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1005, 99, N'ICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1006, 99, N'LA TINGUIÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1007, 99, N'LOS AQUIJES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1008, 99, N'OCUCAJE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1009, 99, N'PACHACUTEC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1010, 99, N'PARCONA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1011, 99, N'PUEBLO NUEVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1012, 99, N'SALAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1013, 99, N'SAN JOSE DE LOS MOLINOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1014, 99, N'SAN JUAN BAUTISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1015, 99, N'SANTIAGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1016, 99, N'SUBTANJALLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1017, 99, N'TATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1018, 99, N'YAUCA DEL ROSARIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1019, 100, N'ALTO LARAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1020, 100, N'CHAVIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1021, 100, N'CHINCHA ALTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1022, 100, N'CHINCHA BAJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1023, 100, N'EL CARMEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1024, 100, N'GROCIO PRADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1025, 100, N'PUEBLO NUEVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1026, 100, N'SAN JUAN DE YANAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1027, 100, N'SAN PEDRO DE HUACARPANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1028, 100, N'SUNAMPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1029, 100, N'TAMBO DE MORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1030, 101, N'CHANGUILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1031, 101, N'EL INGENIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1032, 101, N'MARCONA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1033, 101, N'NAZCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1034, 101, N'VISTA ALEGRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1035, 102, N'LLIPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1036, 102, N'PALPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1037, 102, N'RIO GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1038, 102, N'SANTA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1039, 102, N'TIBILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1040, 103, N'HUANCANO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1041, 103, N'HUMAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1042, 103, N'INDEPENDENCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1043, 103, N'PARACAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1044, 103, N'PISCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1045, 103, N'SAN ANDRES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1046, 103, N'SAN CLEMENTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1047, 103, N'TUPAC AMARU INCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1048, 104, N'CARHUACALLANGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1049, 104, N'CHACAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1050, 104, N'CHICCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1051, 104, N'CHILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1052, 104, N'CHONGOS ALTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1053, 104, N'CHUPURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1054, 104, N'COLCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1055, 104, N'CULLHUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1056, 104, N'EL TAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1057, 104, N'HUACRAPUQUIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1058, 104, N'HUALHUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1059, 104, N'HUANCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1060, 104, N'HUANCAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1061, 104, N'HUASICANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1062, 104, N'HUAYUCACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1063, 104, N'INGENIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1064, 104, N'PARIAHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1065, 104, N'PILCOMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1066, 104, N'PUCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1067, 104, N'QUICHUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1068, 104, N'QUILCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1069, 104, N'SAN AGUSTIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1070, 104, N'SAN JERONIMO DE TUNAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1071, 104, N'SAÑO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1072, 104, N'SANTO DOMINGO DE ACOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1073, 104, N'SAPALLANGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1074, 104, N'SICAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1075, 104, N'VIQUES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1076, 105, N'ACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1077, 105, N'ANDAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1078, 105, N'CHAMBARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1079, 105, N'COCHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1080, 105, N'COMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1081, 105, N'CONCEPCION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1082, 105, N'HEROINAS TOLEDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1083, 105, N'MANZANARES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1084, 105, N'MARISCAL CASTILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1085, 105, N'MATAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1086, 105, N'MITO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1087, 105, N'NUEVE DE JULIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1088, 105, N'ORCOTUNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1089, 105, N'SAN JOSE DE QUERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1090, 105, N'SANTA ROSA DE OCOPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1091, 106, N'CHANCHAMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1092, 106, N'PERENE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1093, 106, N'PICHANAQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1094, 106, N'SAN LUIS DE SHUARO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1095, 106, N'SAN RAMON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1096, 106, N'VITOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1097, 107, N'ACOLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1098, 107, N'APATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1099, 107, N'ATAURA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1100, 107, N'CANCHAYLLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1101, 107, N'CURICACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1102, 107, N'EL MANTARO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1103, 107, N'HUAMALI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1104, 107, N'HUARIPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1105, 107, N'HUERTAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1106, 107, N'JANJAILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1107, 107, N'JAUJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1108, 107, N'JULCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1109, 107, N'LEONOR ORDOÑEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1110, 107, N'LLOCLLAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1111, 107, N'MARCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1112, 107, N'MASMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1113, 107, N'MASMA CHICCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1114, 107, N'MOLINOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1115, 107, N'MONOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1116, 107, N'MUQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1117, 107, N'MUQUIYAUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1118, 107, N'PACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1119, 107, N'PACCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1120, 107, N'PANCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1121, 107, N'PARCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1122, 107, N'POMACANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1123, 107, N'RICRAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1124, 107, N'SAN LORENZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1125, 107, N'SAN PEDRO DE CHUNAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1126, 107, N'SAUSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1127, 107, N'SINCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1128, 107, N'TUNAN MARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1129, 107, N'YAULI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1130, 107, N'YAUYOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1131, 108, N'CARHUAMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1132, 108, N'JUNIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1133, 108, N'ONDORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1134, 108, N'ULCUMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1135, 109, N'COVIRIALI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1136, 109, N'LLAYLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1137, 109, N'MAZAMARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1138, 109, N'PAMPA HERMOSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1139, 109, N'PANGOA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1140, 109, N'RIO NEGRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1141, 109, N'RIO TAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1142, 109, N'SATIPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1143, 109, N'VIZCATAN DEL ENE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1144, 110, N'ACOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1145, 110, N'HUARICOLCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1146, 110, N'HUASAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1147, 110, N'LA UNION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1148, 110, N'PALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1149, 110, N'PALCAMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1150, 110, N'SAN PEDRO DE CAJAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1151, 110, N'TAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1152, 110, N'TARMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1153, 111, N'CHACAPALPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1154, 111, N'HUAY-HUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1155, 111, N'LA OROYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1156, 111, N'MARCAPOMACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1157, 111, N'MOROCOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1158, 111, N'PACCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1159, 111, N'SANTA BARBARA DE CARHUACAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1160, 111, N'SANTA ROSA DE SACCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1161, 111, N'SUITUCANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1162, 111, N'YAULI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1163, 112, N'AHUAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1164, 112, N'CHONGOS BAJO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1165, 112, N'CHUPACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1166, 112, N'HUACHAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1167, 112, N'HUAMANCACA CHICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1168, 112, N'SAN JUAN DE JARPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1169, 112, N'SAN JUAN DE YSCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1170, 112, N'TRES DE DICIEMBRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1171, 112, N'YANACANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1172, 113, N'EL PORVENIR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1173, 113, N'FLORENCIA DE MORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1174, 113, N'HUANCHACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1175, 113, N'LA ESPERANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1176, 113, N'LAREDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1177, 113, N'MOCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1178, 113, N'POROTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1179, 113, N'SALAVERRY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1180, 113, N'SIMBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1181, 113, N'TRUJILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1182, 113, N'VICTOR LARCO HERRERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1183, 114, N'ASCOPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1184, 114, N'CASA GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1185, 114, N'CHICAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1186, 114, N'CHOCOPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1187, 114, N'MAGDALENA DE CAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1188, 114, N'PAIJAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1189, 114, N'RAZURI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1190, 114, N'SANTIAGO DE CAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1191, 115, N'BAMBAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1192, 115, N'BOLIVAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1193, 115, N'CONDORMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1194, 115, N'LONGOTEA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1195, 115, N'UCHUMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1196, 115, N'UCUNCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1197, 116, N'CHEPEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1198, 116, N'PACANGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1199, 116, N'PUEBLO NUEVO', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1200, 117, N'CALAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1201, 117, N'CARABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1202, 117, N'HUASO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1203, 117, N'JULCAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1204, 118, N'AGALLPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1205, 118, N'CHARAT', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1206, 118, N'HUARANCHAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1207, 118, N'LA CUESTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1208, 118, N'MACHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1209, 118, N'OTUZCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1210, 118, N'PARANDAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1211, 118, N'SALPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1212, 118, N'SINSICAP', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1213, 118, N'USQUIL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1214, 119, N'GUADALUPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1215, 119, N'JEQUETEPEQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1216, 119, N'PACASMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1217, 119, N'SAN JOSE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1218, 119, N'SAN PEDRO DE LLOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1219, 120, N'BULDIBUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1220, 120, N'CHILLIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1221, 120, N'HUANCASPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1222, 120, N'HUAYLILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1223, 120, N'HUAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1224, 120, N'ONGON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1225, 120, N'PARCOY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1226, 120, N'PATAZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1227, 120, N'PIAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1228, 120, N'SANTIAGO DE CHALLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1229, 120, N'TAURIJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1230, 120, N'TAYABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1231, 120, N'URPAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1232, 121, N'CHUGAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1233, 121, N'COCHORCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1234, 121, N'CURGOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1235, 121, N'HUAMACHUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1236, 121, N'MARCABAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1237, 121, N'SANAGORAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1238, 121, N'SARIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1239, 121, N'SARTIMBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1240, 122, N'ANGASMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1241, 122, N'CACHICADAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1242, 122, N'MOLLEBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1243, 122, N'MOLLEPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1244, 122, N'QUIRUVILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1245, 122, N'SANTA CRUZ DE CHUCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1246, 122, N'SANTIAGO DE CHUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1247, 122, N'SITABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1248, 123, N'CASCAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1249, 123, N'LUCMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1250, 123, N'MARMOT', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1251, 123, N'SAYAPULLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1252, 124, N'CHAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1253, 124, N'GUADALUPITO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1254, 124, N'VIRU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1255, 125, N'CAYALTI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1256, 125, N'CHICLAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1257, 125, N'CHONGOYAPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1258, 125, N'ETEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1259, 125, N'ETEN PUERTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1260, 125, N'JOSE LEONARDO ORTIZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1261, 125, N'LA VICTORIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1262, 125, N'LAGUNAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1263, 125, N'MONSEFU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1264, 125, N'NUEVA ARICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1265, 125, N'OYOTUN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1266, 125, N'PATAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1267, 125, N'PICSI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1268, 125, N'PIMENTEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1269, 125, N'POMALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1270, 125, N'PUCALA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1271, 125, N'REQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1272, 125, N'SAÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1273, 125, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1274, 125, N'TUMAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1275, 126, N'CAÑARIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1276, 126, N'FERREÑAFE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1277, 126, N'INCAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1278, 126, N'MANUEL ANTONIO MESONES MURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1279, 126, N'PITIPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1280, 126, N'PUEBLO NUEVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1281, 127, N'CHOCHOPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1282, 127, N'ILLIMO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1283, 127, N'JAYANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1284, 127, N'LAMBAYEQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1285, 127, N'MOCHUMI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1286, 127, N'MORROPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1287, 127, N'MOTUPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1288, 127, N'OLMOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1289, 127, N'PACORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1290, 127, N'SALAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1291, 127, N'SAN JOSE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1292, 127, N'TUCUME', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1293, 128, N'ANCON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1294, 128, N'ATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1295, 128, N'BARRANCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1296, 128, N'BREÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1297, 128, N'CARABAYLLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1298, 128, N'CHACLACAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1299, 128, N'CHORRILLOS', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1300, 128, N'CIENEGUILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1301, 128, N'COMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1302, 128, N'EL AGUSTINO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1303, 128, N'INDEPENDENCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1304, 128, N'JESUS MARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1305, 128, N'LA MOLINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1306, 128, N'LA VICTORIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1307, 128, N'LIMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1308, 128, N'LINCE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1309, 128, N'LOS OLIVOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1310, 128, N'LURIGANCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1311, 128, N'LURIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1312, 128, N'MAGDALENA DEL MAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1313, 128, N'MIRAFLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1314, 128, N'PACHACAMAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1315, 128, N'PUCUSANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1316, 128, N'PUEBLO LIBRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1317, 128, N'PUENTE PIEDRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1318, 128, N'PUNTA HERMOSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1319, 128, N'PUNTA NEGRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1320, 128, N'RIMAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1321, 128, N'SAN BARTOLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1322, 128, N'SAN BORJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1323, 128, N'SAN ISIDRO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1324, 128, N'SAN JUAN DE LURIGANCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1325, 128, N'SAN JUAN DE MIRAFLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1326, 128, N'SAN LUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1327, 128, N'SAN MARTIN DE PORRES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1328, 128, N'SAN MIGUEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1329, 128, N'SANTA ANITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1330, 128, N'SANTA MARIA DE HUACHIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1331, 128, N'SANTA MARIA DEL MAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1332, 128, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1333, 128, N'SANTIAGO DE SURCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1334, 128, N'SURQUILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1335, 128, N'VILLA EL SALVADOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1336, 128, N'VILLA MARIA DEL TRIUNFO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1337, 129, N'BARRANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1338, 129, N'PARAMONGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1339, 129, N'PATIVILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1340, 129, N'SUPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1341, 129, N'SUPE PUERTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1342, 130, N'CAJATAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1343, 130, N'COPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1344, 130, N'GORGOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1345, 130, N'HUANCAPON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1346, 130, N'MANAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1347, 131, N'ARAHUAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1348, 131, N'CANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1349, 131, N'HUAMANTANGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1350, 131, N'HUAROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1351, 131, N'LACHAQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1352, 131, N'SAN BUENAVENTURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1353, 131, N'SANTA ROSA DE QUIVES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1354, 132, N'ASIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1355, 132, N'CALANGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1356, 132, N'CERRO AZUL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1357, 132, N'CHILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1358, 132, N'COAYLLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1359, 132, N'IMPERIAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1360, 132, N'LUNAHUANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1361, 132, N'MALA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1362, 132, N'NUEVO IMPERIAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1363, 132, N'PACARAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1364, 132, N'QUILMANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1365, 132, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1366, 132, N'SAN LUIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1367, 132, N'SAN VICENTE DE CAÑETE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1368, 132, N'SANTA CRUZ DE FLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1369, 132, N'ZUÑIGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1370, 133, N'ATAVILLOS ALTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1371, 133, N'ATAVILLOS BAJO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1372, 133, N'AUCALLAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1373, 133, N'CHANCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1374, 133, N'HUARAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1375, 133, N'IHUARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1376, 133, N'LAMPIAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1377, 133, N'PACARAOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1378, 133, N'SAN MIGUEL DE ACOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1379, 133, N'SANTA CRUZ DE ANDAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1380, 133, N'SUMBILCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1381, 133, N'VEINTISIETE DE NOVIEMBRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1382, 134, N'ANTIOQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1383, 134, N'CALLAHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1384, 134, N'CARAMPOMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1385, 134, N'CHICLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1386, 134, N'CUENCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1387, 134, N'HUACHUPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1388, 134, N'HUANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1389, 134, N'HUAROCHIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1390, 134, N'LAHUAYTAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1391, 134, N'LANGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1392, 134, N'LARAOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1393, 134, N'MARIATANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1394, 134, N'MATUCANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1395, 134, N'RICARDO PALMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1396, 134, N'SAN ANDRES DE TUPICOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1397, 134, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1398, 134, N'SAN BARTOLOME', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1399, 134, N'SAN DAMIAN', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1400, 134, N'SAN JUAN DE IRIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1401, 134, N'SAN JUAN DE TANTARANCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1402, 134, N'SAN LORENZO DE QUINTI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1403, 134, N'SAN MATEO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1404, 134, N'SAN MATEO DE OTAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1405, 134, N'SAN PEDRO DE CASTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1406, 134, N'SAN PEDRO DE HUANCAYRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1407, 134, N'SANGALLAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1408, 134, N'SANTA CRUZ DE COCACHACRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1409, 134, N'SANTA EULALIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1410, 134, N'SANTIAGO DE ANCHUCAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1411, 134, N'SANTIAGO DE TUNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1412, 134, N'SANTO DOMINGO DE LOS OLLEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1413, 134, N'SURCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1414, 135, N'AMBAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1415, 135, N'CALETA DE CARQUIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1416, 135, N'CHECRAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1417, 135, N'HUACHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1418, 135, N'HUALMAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1419, 135, N'HUAURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1420, 135, N'LEONCIO PRADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1421, 135, N'PACCHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1422, 135, N'SANTA LEONOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1423, 135, N'SANTA MARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1424, 135, N'SAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1425, 135, N'VEGUETA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1426, 136, N'ANDAJES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1427, 136, N'CAUJUL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1428, 136, N'COCHAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1429, 136, N'NAVAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1430, 136, N'OYON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1431, 136, N'PACHANGARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1432, 137, N'ALIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1433, 137, N'AYAUCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1434, 137, N'AYAVIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1435, 137, N'AZANGARO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1436, 137, N'CACRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1437, 137, N'CARANIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1438, 137, N'CATAHUASI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1439, 137, N'CHOCOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1440, 137, N'COCHAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1441, 137, N'COLONIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1442, 137, N'HONGOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1443, 137, N'HUAMPARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1444, 137, N'HUANCAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1445, 137, N'HUAÑEC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1446, 137, N'HUANGASCAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1447, 137, N'HUANTAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1448, 137, N'LARAOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1449, 137, N'LINCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1450, 137, N'MADEAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1451, 137, N'MIRAFLORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1452, 137, N'OMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1453, 137, N'PUTINZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1454, 137, N'QUINCHES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1455, 137, N'QUINOCAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1456, 137, N'SAN JOAQUIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1457, 137, N'SAN PEDRO DE PILAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1458, 137, N'TANTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1459, 137, N'TAURIPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1460, 137, N'TOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1461, 137, N'TUPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1462, 137, N'VIÑAC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1463, 137, N'VITIS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1464, 137, N'YAUYOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1465, 138, N'ALTO NANAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1466, 138, N'BELEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1467, 138, N'FERNANDO LORES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1468, 138, N'INDIANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1469, 138, N'IQUITOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1470, 138, N'LAS AMAZONAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1471, 138, N'MAZAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1472, 138, N'NAPO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1473, 138, N'PUNCHANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1474, 138, N'PUTUMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1475, 138, N'SAN JUAN BAUTISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1476, 138, N'TENIENTE MANUEL CLAVERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1477, 138, N'TORRES CAUSANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1478, 139, N'BALSAPUERTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1479, 139, N'JEBEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1480, 139, N'LAGUNAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1481, 139, N'SANTA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1482, 139, N'TENIENTE CESAR LOPEZ ROJAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1483, 139, N'YURIMAGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1484, 140, N'NAUTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1485, 140, N'PARINARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1486, 140, N'TIGRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1487, 140, N'TROMPETEROS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1488, 140, N'URARINAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1489, 141, N'PEBAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1490, 141, N'RAMON CASTILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1491, 141, N'SAN PABLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1492, 141, N'YAVARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1493, 142, N'ALTO TAPICHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1494, 142, N'CAPELO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1495, 142, N'EMILIO SAN MARTIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1496, 142, N'JENARO HERRERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1497, 142, N'MAQUIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1498, 142, N'PUINAHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1499, 142, N'REQUENA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1500, 142, N'SAQUENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1501, 142, N'SOPLIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1502, 142, N'TAPICHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1503, 142, N'YAQUERANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1504, 143, N'CONTAMANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1505, 143, N'INAHUAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1506, 143, N'PADRE MARQUEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1507, 143, N'PAMPA HERMOSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1508, 143, N'SARAYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1509, 143, N'VARGAS GUERRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1510, 144, N'ANDOAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1511, 144, N'BARRANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1512, 144, N'CAHUAPANAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1513, 144, N'MANSERICHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1514, 144, N'MORONA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1515, 144, N'PASTAZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1516, 145, N'PUTUMAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1517, 145, N'ROSA PANDURO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1518, 145, N'TENIENTE MANUEL CLAVERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1519, 145, N'YAGUAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1520, 146, N'INAMBARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1521, 146, N'LABERINTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1522, 146, N'LAS PIEDRAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1523, 146, N'TAMBOPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1524, 147, N'FITZCARRALD', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1525, 147, N'HUEPETUHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1526, 147, N'MADRE DE DIOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1527, 147, N'MANU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1528, 148, N'IBERIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1529, 148, N'IÑAPARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1530, 148, N'TAHUAMANU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1531, 149, N'CARUMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1532, 149, N'CUCHUMBAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1533, 149, N'MOQUEGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1534, 149, N'SAMEGUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1535, 149, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1536, 149, N'SAN CRISTOBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1537, 149, N'TORATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1538, 150, N'CHOJATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1539, 150, N'COALAQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1540, 150, N'ICHUÑA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1541, 150, N'LA CAPILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1542, 150, N'LLOQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1543, 150, N'MATALAQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1544, 150, N'OMATE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1545, 150, N'PUQUINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1546, 150, N'QUINISTAQUILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1547, 150, N'UBINAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1548, 150, N'YUNGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1549, 151, N'EL ALGARROBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1550, 151, N'ILO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1551, 151, N'PACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1552, 152, N'CHAUPIMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1553, 152, N'HUACHON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1554, 152, N'HUARIACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1555, 152, N'HUAYLLAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1556, 152, N'NINACACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1557, 152, N'PALLANCHACRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1558, 152, N'PAUCARTAMBO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1559, 152, N'SAN FRANCISCO DE ASIS DE YARUSYACAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1560, 152, N'SIMON BOLIVAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1561, 152, N'TICLACAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1562, 152, N'TINYAHUARCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1563, 152, N'VICCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1564, 152, N'YANACANCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1565, 153, N'CHACAYAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1566, 153, N'GOYLLARISQUIZGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1567, 153, N'PAUCAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1568, 153, N'SAN PEDRO DE PILLAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1569, 153, N'SANTA ANA DE TUSI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1570, 153, N'TAPUC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1571, 153, N'VILCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1572, 153, N'YANAHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1573, 154, N'CHONTABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1574, 154, N'CONSTITUCION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1575, 154, N'HUANCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1576, 154, N'OXAPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1577, 154, N'PALCAZU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1578, 154, N'POZUZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1579, 154, N'PUERTO BERMUDEZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1580, 154, N'VILLA RICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1581, 155, N'CASTILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1582, 155, N'CATACAOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1583, 155, N'CURA MORI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1584, 155, N'EL TALLAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1585, 155, N'LA ARENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1586, 155, N'LA UNION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1587, 155, N'LAS LOMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1588, 155, N'PIURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1589, 155, N'TAMBO GRANDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1590, 155, N'VEINTISEIS DE OCTUBRE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1591, 156, N'AYABACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1592, 156, N'FRIAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1593, 156, N'JILILI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1594, 156, N'LAGUNAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1595, 156, N'MONTERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1596, 156, N'PACAIPAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1597, 156, N'PAIMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1598, 156, N'SAPILLICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1599, 156, N'SICCHEZ', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1600, 156, N'SUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1601, 157, N'CANCHAQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1602, 157, N'EL CARMEN DE LA FRONTERA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1603, 157, N'HUANCABAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1604, 157, N'HUARMACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1605, 157, N'LALAQUIZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1606, 157, N'SAN MIGUEL DE EL FAIQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1607, 157, N'SONDOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1608, 157, N'SONDORILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1609, 158, N'BUENOS AIRES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1610, 158, N'CHALACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1611, 158, N'CHULUCANAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1612, 158, N'LA MATANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1613, 158, N'MORROPON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1614, 158, N'SALITRAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1615, 158, N'SAN JUAN DE BIGOTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1616, 158, N'SANTA CATALINA DE MOSSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1617, 158, N'SANTO DOMINGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1618, 158, N'YAMANGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1619, 159, N'AMOTAPE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1620, 159, N'ARENAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1621, 159, N'COLAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1622, 159, N'LA HUACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1623, 159, N'PAITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1624, 159, N'TAMARINDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1625, 159, N'VICHAYAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1626, 160, N'BELLAVISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1627, 160, N'IGNACIO ESCUDERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1628, 160, N'LANCONES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1629, 160, N'MARCAVELICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1630, 160, N'MIGUEL CHECA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1631, 160, N'QUERECOTILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1632, 160, N'SALITRAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1633, 160, N'SULLANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1634, 161, N'EL ALTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1635, 161, N'LA BREA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1636, 161, N'LOBITOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1637, 161, N'LOS ORGANOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1638, 161, N'MANCORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1639, 161, N'PARIÑAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1640, 162, N'BELLAVISTA DE LA UNION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1641, 162, N'BERNAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1642, 162, N'CRISTO NOS VALGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1643, 162, N'RINCONADA LLICUAR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1644, 162, N'SECHURA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1645, 162, N'VICE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1646, 163, N'ACORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1647, 163, N'AMANTANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1648, 163, N'ATUNCOLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1649, 163, N'CAPACHICA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1650, 163, N'CHUCUITO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1651, 163, N'COATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1652, 163, N'HUATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1653, 163, N'MAÑAZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1654, 163, N'PAUCARCOLLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1655, 163, N'PICHACANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1656, 163, N'PLATERIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1657, 163, N'PUNO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1658, 163, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1659, 163, N'TIQUILLACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1660, 163, N'VILQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1661, 164, N'ACHAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1662, 164, N'ARAPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1663, 164, N'ASILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1664, 164, N'AZANGARO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1665, 164, N'CAMINACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1666, 164, N'CHUPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1667, 164, N'JOSE DOMINGO CHOQUEHUANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1668, 164, N'MUÑANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1669, 164, N'POTONI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1670, 164, N'SAMAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1671, 164, N'SAN ANTON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1672, 164, N'SAN JOSE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1673, 164, N'SAN JUAN DE SALINAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1674, 164, N'SANTIAGO DE PUPUJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1675, 164, N'TIRAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1676, 165, N'AJOYANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1677, 165, N'AYAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1678, 165, N'COASA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1679, 165, N'CORANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1680, 165, N'CRUCERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1681, 165, N'ITUATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1682, 165, N'MACUSANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1683, 165, N'OLLACHEA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1684, 165, N'SAN GABAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1685, 165, N'USICAYOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1686, 166, N'DESAGUADERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1687, 166, N'HUACULLANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1688, 166, N'JULI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1689, 166, N'KELLUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1690, 166, N'PISACOMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1691, 166, N'POMATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1692, 166, N'ZEPITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1693, 167, N'CAPAZO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1694, 167, N'CONDURIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1695, 167, N'ILAVE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1696, 167, N'PILCUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1697, 167, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1698, 168, N'COJATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1699, 168, N'HUANCANE', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1700, 168, N'HUATASANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1701, 168, N'INCHUPALLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1702, 168, N'PUSI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1703, 168, N'ROSASPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1704, 168, N'TARACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1705, 168, N'VILQUE CHICO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1706, 169, N'CABANILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1707, 169, N'CALAPUJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1708, 169, N'LAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1709, 169, N'NICASIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1710, 169, N'OCUVIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1711, 169, N'PALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1712, 169, N'PARATIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1713, 169, N'PUCARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1714, 169, N'SANTA LUCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1715, 169, N'VILAVILA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1716, 170, N'ANTAUTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1717, 170, N'AYAVIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1718, 170, N'CUPI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1719, 170, N'LLALLI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1720, 170, N'MACARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1721, 170, N'NUÑOA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1722, 170, N'ORURILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1723, 170, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1724, 170, N'UMACHIRI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1725, 171, N'CONIMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1726, 171, N'HUAYRAPATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1727, 171, N'MOHO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1728, 171, N'TILALI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1729, 172, N'ANANEA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1730, 172, N'PEDRO VILCA APAZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1731, 172, N'PUTINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1732, 172, N'QUILCAPUNCU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1733, 172, N'SINA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1734, 173, N'CABANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1735, 173, N'CABANILLAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1736, 173, N'CARACOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1737, 173, N'JULIACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1738, 173, N'SAN MIGUEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1739, 174, N'ALTO INAMBARI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1740, 174, N'CUYOCUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1741, 174, N'LIMBANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1742, 174, N'PATAMBUCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1743, 174, N'PHARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1744, 174, N'QUIACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1745, 174, N'SAN JUAN DEL ORO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1746, 174, N'SAN PEDRO DE PUTINA PUNCO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1747, 174, N'SANDIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1748, 174, N'YANAHUAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1749, 175, N'ANAPIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1750, 175, N'COPANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1751, 175, N'CUTURAPI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1752, 175, N'OLLARAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1753, 175, N'TINICACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1754, 175, N'UNICACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1755, 175, N'YUNGUYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1756, 176, N'CALZADA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1757, 176, N'HABANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1758, 176, N'JEPELACIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1759, 176, N'MOYOBAMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1760, 176, N'SORITOR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1761, 176, N'YANTALO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1762, 177, N'ALTO BIAVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1763, 177, N'BAJO BIAVO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1764, 177, N'BELLAVISTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1765, 177, N'HUALLAGA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1766, 177, N'SAN PABLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1767, 177, N'SAN RAFAEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1768, 178, N'AGUA BLANCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1769, 178, N'SAN JOSE DE SISA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1770, 178, N'SAN MARTIN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1771, 178, N'SANTA ROSA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1772, 178, N'SHATOJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1773, 179, N'ALTO SAPOSOA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1774, 179, N'EL ESLABON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1775, 179, N'PISCOYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1776, 179, N'SACANCHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1777, 179, N'SAPOSOA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1778, 179, N'TINGO DE SAPOSOA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1779, 180, N'ALONSO DE ALVARADO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1780, 180, N'BARRANQUITA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1781, 180, N'CAYNARACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1782, 180, N'CUÑUMBUQUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1783, 180, N'LAMAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1784, 180, N'PINTO RECODO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1785, 180, N'RUMISAPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1786, 180, N'SAN ROQUE DE CUMBAZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1787, 180, N'SHANAO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1788, 180, N'TABALOSOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1789, 180, N'ZAPATERO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1790, 181, N'CAMPANILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1791, 181, N'HUICUNGO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1792, 181, N'JUANJUI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1793, 181, N'PACHIZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1794, 181, N'PAJARILLO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1795, 182, N'BUENOS AIRES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1796, 182, N'CASPISAPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1797, 182, N'PICOTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1798, 182, N'PILLUANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1799, 182, N'PUCACACA', 1)
GO
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1800, 182, N'SAN CRISTOBAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1801, 182, N'SAN HILARION', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1802, 182, N'SHAMBOYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1803, 182, N'TINGO DE PONASA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1804, 182, N'TRES UNIDOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1805, 183, N'AWAJUN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1806, 183, N'ELIAS SOPLIN VARGAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1807, 183, N'NUEVA CAJAMARCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1808, 183, N'PARDO MIGUEL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1809, 183, N'POSIC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1810, 183, N'RIOJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1811, 183, N'SAN FERNANDO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1812, 183, N'YORONGOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1813, 183, N'YURACYACU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1814, 184, N'ALBERTO LEVEAU', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1815, 184, N'CACATACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1816, 184, N'CHAZUTA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1817, 184, N'CHIPURANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1818, 184, N'EL PORVENIR', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1819, 184, N'HUIMBAYOC', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1820, 184, N'JUAN GUERRA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1821, 184, N'LA BANDA DE SHILCAYO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1822, 184, N'MORALES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1823, 184, N'PAPAPLAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1824, 184, N'SAN ANTONIO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1825, 184, N'SAUCE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1826, 184, N'SHAPAJA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1827, 184, N'TARAPOTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1828, 185, N'NUEVO PROGRESO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1829, 185, N'POLVORA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1830, 185, N'SANTA LUCIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1831, 185, N'SHUNTE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1832, 185, N'TOCACHE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1833, 185, N'UCHIZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1834, 186, N'ALTO DE LA ALIANZA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1835, 186, N'CALANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1836, 186, N'CIUDAD NUEVA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1837, 186, N'CORONEL GREGORIO ALBARRACIN LANCHIPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1838, 186, N'INCLAN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1839, 186, N'LA YARADA LOS PALOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1840, 186, N'PACHIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1841, 186, N'PALCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1842, 186, N'POCOLLAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1843, 186, N'SAMA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1844, 186, N'TACNA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1845, 187, N'CAIRANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1846, 187, N'CAMILACA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1847, 187, N'CANDARAVE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1848, 187, N'CURIBAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1849, 187, N'HUANUARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1850, 187, N'QUILAHUANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1851, 188, N'ILABAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1852, 188, N'ITE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1853, 188, N'LOCUMBA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1854, 189, N'ESTIQUE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1855, 189, N'ESTIQUE-PAMPA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1856, 189, N'HEROES ALBARRACIN CHUCATAMANI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1857, 189, N'SITAJARA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1858, 189, N'SUSAPAYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1859, 189, N'TARATA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1860, 189, N'TARUCACHI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1861, 189, N'TICACO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1862, 190, N'CORRALES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1863, 190, N'LA CRUZ', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1864, 190, N'PAMPAS DE HOSPITAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1865, 190, N'SAN JACINTO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1866, 190, N'SAN JUAN DE LA VIRGEN', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1867, 190, N'TUMBES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1868, 191, N'CANOAS DE PUNTA SAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1869, 191, N'CASITAS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1870, 191, N'ZORRITOS', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1871, 192, N'AGUAS VERDES', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1872, 192, N'MATAPALO', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1873, 192, N'PAPAYAL', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1874, 192, N'ZARUMILLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1875, 193, N'CALLERIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1876, 193, N'CAMPOVERDE', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1877, 193, N'IPARIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1878, 193, N'MANANTAY', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1879, 193, N'MASISEA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1880, 193, N'NUEVA REQUENA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1881, 193, N'YARINACOCHA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1882, 194, N'RAYMONDI', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1883, 194, N'SEPAHUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1884, 194, N'TAHUANIA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1885, 194, N'YURUA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1886, 195, N'ALEXANDER VON HUMBOLDT', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1887, 195, N'BOQUERON', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1888, 195, N'CURIMANA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1889, 195, N'HUIPOCA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1890, 195, N'IRAZOLA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1891, 195, N'NESHUYA', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1892, 195, N'PADRE ABAD', 1)
INSERT [dbo].[Distritos] ([IdDistrito], [IdProvincia], [Nombre], [Activo]) VALUES (1893, 196, N'PURUS', 1)
SET IDENTITY_INSERT [dbo].[Distritos] OFF
GO
SET IDENTITY_INSERT [dbo].[Provincias] ON 

INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (1, 1, N'CHACHAPOYAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (2, 1, N'BAGUA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (3, 1, N'BONGARA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (4, 1, N'CONDORCANQUI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (5, 1, N'LUYA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (6, 1, N'RODRIGUEZ DE MENDOZA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (7, 1, N'UTCUBAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (8, 2, N'HUARAZ', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (9, 2, N'AIJA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (10, 2, N'ANTONIO RAYMONDI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (11, 2, N'ASUNCION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (12, 2, N'BOLOGNESI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (13, 2, N'CARHUAZ', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (14, 2, N'CARLOS FERMIN FITZCARRALD', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (15, 2, N'CASMA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (16, 2, N'CORONGO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (17, 2, N'HUARI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (18, 2, N'HUARMEY', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (19, 2, N'HUAYLAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (20, 2, N'MARISCAL LUZURIAGA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (21, 2, N'OCROS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (22, 2, N'PALLASCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (23, 2, N'POMABAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (24, 2, N'RECUAY', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (25, 2, N'SANTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (26, 2, N'SIHUAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (27, 2, N'YUNGAY', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (28, 3, N'ABANCAY', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (29, 3, N'ANDAHUAYLAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (30, 3, N'ANTABAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (31, 3, N'AYMARAES', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (32, 3, N'COTABAMBAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (33, 3, N'CHINCHEROS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (34, 3, N'GRAU', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (35, 4, N'AREQUIPA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (36, 4, N'CAMANA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (37, 4, N'CARAVELI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (38, 4, N'CASTILLA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (39, 4, N'CAYLLOMA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (40, 4, N'CONDESUYOS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (41, 4, N'ISLAY', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (42, 4, N'LA UNION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (43, 5, N'HUAMANGA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (44, 5, N'CANGALLO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (45, 5, N'HUANCA SANCOS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (46, 5, N'HUANTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (47, 5, N'LA MAR', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (48, 5, N'LUCANAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (49, 5, N'PARINACOCHAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (50, 5, N'PAUCAR DEL SARA SARA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (51, 5, N'SUCRE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (52, 5, N'VICTOR FAJARDO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (53, 5, N'VILCAS HUAMAN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (54, 6, N'CAJAMARCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (55, 6, N'CAJABAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (56, 6, N'CELENDIN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (57, 6, N'CHOTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (58, 6, N'CONTUMAZA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (59, 6, N'CUTERVO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (60, 6, N'HUALGAYOC', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (61, 6, N'JAEN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (62, 6, N'SAN IGNACIO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (63, 6, N'SAN MARCOS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (64, 6, N'SAN MIGUEL', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (65, 6, N'SAN PABLO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (66, 6, N'SANTA CRUZ', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (67, 7, N'CALLAO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (68, 8, N'CUSCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (69, 8, N'ACOMAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (70, 8, N'ANTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (71, 8, N'CALCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (72, 8, N'CANAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (73, 8, N'CANCHIS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (74, 8, N'CHUMBIVILCAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (75, 8, N'ESPINAR', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (76, 8, N'LA CONVENCION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (77, 8, N'PARURO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (78, 8, N'PAUCARTAMBO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (79, 8, N'QUISPICANCHI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (80, 8, N'URUBAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (81, 9, N'HUANCAVELICA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (82, 9, N'ACOBAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (83, 9, N'ANGARAES', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (84, 9, N'CASTROVIRREYNA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (85, 9, N'CHURCAMPA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (86, 9, N'HUAYTARA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (87, 9, N'TAYACAJA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (88, 10, N'HUANUCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (89, 10, N'AMBO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (90, 10, N'DOS DE MAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (91, 10, N'HUACAYBAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (92, 10, N'HUAMALIES', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (93, 10, N'LEONCIO PRADO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (94, 10, N'MARAÑON', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (95, 10, N'PACHITEA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (96, 10, N'PUERTO INCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (97, 10, N'LAURICOCHA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (98, 10, N'YAROWILCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (99, 11, N'ICA', 1)
GO
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (100, 11, N'CHINCHA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (101, 11, N'NAZCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (102, 11, N'PALPA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (103, 11, N'PISCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (104, 12, N'HUANCAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (105, 12, N'CONCEPCION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (106, 12, N'CHANCHAMAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (107, 12, N'JAUJA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (108, 12, N'JUNIN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (109, 12, N'SATIPO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (110, 12, N'TARMA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (111, 12, N'YAULI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (112, 12, N'CHUPACA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (113, 13, N'TRUJILLO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (114, 13, N'ASCOPE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (115, 13, N'BOLIVAR', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (116, 13, N'CHEPEN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (117, 13, N'JULCAN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (118, 13, N'OTUZCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (119, 13, N'PACASMAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (120, 13, N'PATAZ', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (121, 13, N'SANCHEZ CARRION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (122, 13, N'SANTIAGO DE CHUCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (123, 13, N'GRAN CHIMU', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (124, 13, N'VIRU', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (125, 14, N'CHICLAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (126, 14, N'FERREÑAFE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (127, 14, N'LAMBAYEQUE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (128, 15, N'LIMA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (129, 15, N'BARRANCA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (130, 15, N'CAJATAMBO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (131, 15, N'CANTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (132, 15, N'CAÑETE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (133, 15, N'HUARAL', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (134, 15, N'HUAROCHIRI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (135, 15, N'HUAURA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (136, 15, N'OYON', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (137, 15, N'YAUYOS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (138, 16, N'MAYNAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (139, 16, N'ALTO AMAZONAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (140, 16, N'LORETO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (141, 16, N'MARISCAL RAMON CASTILLA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (142, 16, N'REQUENA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (143, 16, N'UCAYALI', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (144, 16, N'DATEM DEL MARAÑON', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (145, 16, N'PUTUMAYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (146, 17, N'TAMBOPATA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (147, 17, N'MANU', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (148, 17, N'TAHUAMANU', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (149, 18, N'MARISCAL NIETO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (150, 18, N'GENERAL SANCHEZ CERRO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (151, 18, N'ILO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (152, 19, N'PASCO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (153, 19, N'DANIEL ALCIDES CARRION', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (154, 19, N'OXAPAMPA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (155, 20, N'PIURA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (156, 20, N'AYABACA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (157, 20, N'HUANCABAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (158, 20, N'MORROPON', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (159, 20, N'PAITA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (160, 20, N'SULLANA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (161, 20, N'TALARA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (162, 20, N'SECHURA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (163, 21, N'PUNO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (164, 21, N'AZANGARO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (165, 21, N'CARABAYA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (166, 21, N'CHUCUITO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (167, 21, N'EL COLLAO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (168, 21, N'HUANCANE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (169, 21, N'LAMPA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (170, 21, N'MELGAR', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (171, 21, N'MOHO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (172, 21, N'SAN ANTONIO DE PUTINA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (173, 21, N'SAN ROMAN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (174, 21, N'SANDIA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (175, 21, N'YUNGUYO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (176, 22, N'MOYOBAMBA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (177, 22, N'BELLAVISTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (178, 22, N'EL DORADO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (179, 22, N'HUALLAGA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (180, 22, N'LAMAS', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (181, 22, N'MARISCAL CACERES', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (182, 22, N'PICOTA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (183, 22, N'RIOJA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (184, 22, N'SAN MARTIN', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (185, 22, N'TOCACHE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (186, 23, N'TACNA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (187, 23, N'CANDARAVE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (188, 23, N'JORGE BASADRE', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (189, 23, N'TARATA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (190, 24, N'TUMBES', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (191, 24, N'CONTRALMIRANTE VILLAR', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (192, 24, N'ZARUMILLA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (193, 25, N'CORONEL PORTILLO', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (194, 25, N'ATALAYA', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (195, 25, N'PADRE ABAD', 1)
INSERT [dbo].[Provincias] ([IdProvincia], [IdDepartamento], [Nombre], [Activo]) VALUES (196, 25, N'PURUS', 1)
SET IDENTITY_INSERT [dbo].[Provincias] OFF
GO
SET IDENTITY_INSERT [dbo].[ReporteRoles] ON 

INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (1, 1, N'direccion_comercial', 1, CAST(N'2026-08-26T03:27:10.6379364' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (2, 2, N'direccion_comercial', 1, CAST(N'2026-08-26T03:27:10.6392875' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (3, 3, N'direccion_comercial', 1, CAST(N'2026-08-26T03:27:10.6392875' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (4, 3, N'gerencia_general', 1, CAST(N'2026-08-26T03:27:10.6396245' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (5, 1, N'supervisor_inversion', 1, CAST(N'2026-08-26T03:27:10.6396245' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (6, 2, N'supervisor_inversion', 1, CAST(N'2026-08-26T03:27:10.6399506' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[ReporteRoles] ([ReporteRolId], [ReporteId], [RoleCodigo], [Activo], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (7, 3, N'supervisor_inversion', 1, CAST(N'2026-08-26T03:27:10.6399506' AS DateTime2), NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[ReporteRoles] OFF
GO
SET IDENTITY_INSERT [dbo].[Reportes] ON 

INSERT [dbo].[Reportes] ([ReporteId], [Clave], [Nombre], [Activo], [Descripcion], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (1, N'avance_ejecutivas', N'Avance de Ejecutivas', 1, NULL, CAST(N'2026-08-26T03:27:10.6379364' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[Reportes] ([ReporteId], [Clave], [Nombre], [Activo], [Descripcion], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (2, N'funnel_conversion', N'Funnel de Conversion', 1, NULL, CAST(N'2026-08-26T03:27:10.6379364' AS DateTime2), NULL, NULL, NULL)
INSERT [dbo].[Reportes] ([ReporteId], [Clave], [Nombre], [Activo], [Descripcion], [CreadoFecha], [CreadoId], [ActualizadoFecha], [ActualizadoId]) VALUES (3, N'control_operaciones', N'Control de Operaciones', 1, NULL, CAST(N'2026-08-26T03:27:10.6379364' AS DateTime2), NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Reportes] OFF
GO
SET IDENTITY_INSERT [dbo].[Representantes] ON 

INSERT [dbo].[Representantes] ([RepresentanteId], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [Celular], [Correo], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (1, N'DNI', N'47541236', N'Joel', N'peña', NULL, NULL, CAST(N'2026-08-31T03:30:29.6070267' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Representantes] ([RepresentanteId], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [Celular], [Correo], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (2, N'DNI', N'47541238', N'LUIS', N'GALLARDP', N'923510660', NULL, CAST(N'2026-09-01T03:29:25.4206800' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Representantes] ([RepresentanteId], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [Celular], [Correo], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (3, N'DNI', N'47541299', N'Moise', N'rivera', N'923510660', NULL, CAST(N'2026-09-02T00:54:35.5481804' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', CAST(N'2026-09-10T04:10:49.8538281' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779')
INSERT [dbo].[Representantes] ([RepresentanteId], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [Celular], [Correo], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (4, N'DNI', N'47541239', N'aaa', N'dd', N'923510660', N'sta@gmaiol.com', CAST(N'2026-09-10T03:50:03.6186631' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
INSERT [dbo].[Representantes] ([RepresentanteId], [TipoDocumento], [NumeroDocumento], [Nombres], [Apellidos], [Celular], [Correo], [CreadoFecha], [CreadoNombre], [CreadoCorreo], [CreadoId], [ActualizadoFecha], [ActualizadoNombre], [ActualizadoCorreo], [ActualizadoId]) VALUES (5, N'CE', N'47541236', N'joela', N'pela', N'923510060', N'sta@gmaiol.com', CAST(N'2026-09-11T00:41:21.3880971' AS DateTime2), N'Michael Enriquez', N'', N'c5f70284-66e8-4a20-b314-8ae2edc81779', NULL, NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[Representantes] OFF
GO
/****** Object:  Index [IX_Actividades_ContactoId_FechaActividad]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Actividades_ContactoId_FechaActividad] ON [dbo].[Actividades]
(
	[ContactoId] ASC,
	[FechaActividad] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_CatalogoCiiu_Codigo]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[CatalogoCiiu] ADD  CONSTRAINT [UQ_CatalogoCiiu_Codigo] UNIQUE NONCLUSTERED 
(
	[Codigo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_CatalogoCiiu_Descripcion]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_CatalogoCiiu_Descripcion] ON [dbo].[CatalogoCiiu]
(
	[Descripcion] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContactoRepresentante_ContactoId]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_ContactoRepresentante_ContactoId] ON [dbo].[ContactoRepresentante]
(
	[ContactoId] ASC,
	[Activo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContactoRepresentante_RepresentanteId]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_ContactoRepresentante_RepresentanteId] ON [dbo].[ContactoRepresentante]
(
	[RepresentanteId] ASC,
	[Activo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_ContactoRepresentante_ContactoId_RepresentanteId_Activo]    Script Date: 8/10/2026 16:16:21 ******/
CREATE UNIQUE NONCLUSTERED INDEX [UQ_ContactoRepresentante_ContactoId_RepresentanteId_Activo] ON [dbo].[ContactoRepresentante]
(
	[ContactoId] ASC,
	[RepresentanteId] ASC
)
WHERE ([Activo]=(1))
WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Contactos_TipoDocumento_NumeroDocumento]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Contactos] ADD  CONSTRAINT [UQ_Contactos_TipoDocumento_NumeroDocumento] UNIQUE NONCLUSTERED 
(
	[TipoDocumento] ASC,
	[NumeroDocumento] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Contactos_ResponsableId]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Contactos_ResponsableId] ON [dbo].[Contactos]
(
	[ResponsableId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContactoTrabajoDependiente_ContactoId]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_ContactoTrabajoDependiente_ContactoId] ON [dbo].[ContactoTrabajoDependiente]
(
	[ContactoId] ASC,
	[Activo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Departamentos_Nombre]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Departamentos] ADD  CONSTRAINT [UQ_Departamentos_Nombre] UNIQUE NONCLUSTERED 
(
	[Nombre] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Direcciones_IdContacto]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Direcciones_IdContacto] ON [dbo].[Direcciones]
(
	[IdContacto] ASC,
	[Activo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Direcciones_IdDistrito]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Direcciones_IdDistrito] ON [dbo].[Direcciones]
(
	[IdDistrito] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Distritos_IdProvincia_Nombre]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Distritos] ADD  CONSTRAINT [UQ_Distritos_IdProvincia_Nombre] UNIQUE NONCLUSTERED 
(
	[IdProvincia] ASC,
	[Nombre] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Distritos_IdProvincia]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Distritos_IdProvincia] ON [dbo].[Distritos]
(
	[IdProvincia] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Distritos_Nombre]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Distritos_Nombre] ON [dbo].[Distritos]
(
	[Nombre] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Notas_ContactoId_CreadoFecha]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Notas_ContactoId_CreadoFecha] ON [dbo].[Notas]
(
	[ContactoId] ASC,
	[CreadoFecha] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Provincias_IdDepartamento_Nombre]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Provincias] ADD  CONSTRAINT [UQ_Provincias_IdDepartamento_Nombre] UNIQUE NONCLUSTERED 
(
	[IdDepartamento] ASC,
	[Nombre] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Provincias_IdDepartamento]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_Provincias_IdDepartamento] ON [dbo].[Provincias]
(
	[IdDepartamento] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_ReporteRoles_Reporte_RoleCodigo]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[ReporteRoles] ADD  CONSTRAINT [UQ_ReporteRoles_Reporte_RoleCodigo] UNIQUE NONCLUSTERED 
(
	[ReporteId] ASC,
	[RoleCodigo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ReporteRoles_ReporteId_Activo]    Script Date: 8/10/2026 16:16:21 ******/
CREATE NONCLUSTERED INDEX [IX_ReporteRoles_ReporteId_Activo] ON [dbo].[ReporteRoles]
(
	[ReporteId] ASC,
	[Activo] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Reportes_Clave]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Reportes] ADD  CONSTRAINT [UQ_Reportes_Clave] UNIQUE NONCLUSTERED 
(
	[Clave] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ_Representantes_TipoDocumento_NumeroDocumento]    Script Date: 8/10/2026 16:16:21 ******/
ALTER TABLE [dbo].[Representantes] ADD  CONSTRAINT [UQ_Representantes_TipoDocumento_NumeroDocumento] UNIQUE NONCLUSTERED 
(
	[TipoDocumento] ASC,
	[NumeroDocumento] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Actividades] ADD  DEFAULT (sysutcdatetime()) FOR [FechaActividad]
GO
ALTER TABLE [dbo].[Actividades] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[CatalogoCiiu] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[ContactoActividad] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[ContactoRepresentante] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[ContactoRepresentante] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[Contactos] ADD  DEFAULT ('NATURAL') FOR [TipoContacto]
GO
ALTER TABLE [dbo].[Contactos] ADD  DEFAULT ((0)) FOR [EsPep]
GO
ALTER TABLE [dbo].[Contactos] ADD  DEFAULT ('ACTIVO') FOR [EstadoContacto]
GO
ALTER TABLE [dbo].[Contactos] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Departamentos] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Direcciones] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Direcciones] ADD  DEFAULT (sysutcdatetime()) FOR [FechaCreacion]
GO
ALTER TABLE [dbo].[Distritos] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Notas] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[Provincias] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[ReporteRoles] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[ReporteRoles] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[Reportes] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Reportes] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[Representantes] ADD  DEFAULT (sysutcdatetime()) FOR [CreadoFecha]
GO
ALTER TABLE [dbo].[Actividades]  WITH CHECK ADD  CONSTRAINT [FK_Actividades_Contactos] FOREIGN KEY([ContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[Actividades] CHECK CONSTRAINT [FK_Actividades_Contactos]
GO
ALTER TABLE [dbo].[ContactoActividad]  WITH CHECK ADD  CONSTRAINT [FK_ContactoActividad_CatalogoCiiu] FOREIGN KEY([CiiuId])
REFERENCES [dbo].[CatalogoCiiu] ([CiiuId])
GO
ALTER TABLE [dbo].[ContactoActividad] CHECK CONSTRAINT [FK_ContactoActividad_CatalogoCiiu]
GO
ALTER TABLE [dbo].[ContactoActividad]  WITH CHECK ADD  CONSTRAINT [FK_ContactoActividad_Contactos] FOREIGN KEY([ContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[ContactoActividad] CHECK CONSTRAINT [FK_ContactoActividad_Contactos]
GO
ALTER TABLE [dbo].[ContactoRepresentante]  WITH CHECK ADD  CONSTRAINT [FK_ContactoRepresentante_Contactos] FOREIGN KEY([ContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[ContactoRepresentante] CHECK CONSTRAINT [FK_ContactoRepresentante_Contactos]
GO
ALTER TABLE [dbo].[ContactoRepresentante]  WITH CHECK ADD  CONSTRAINT [FK_ContactoRepresentante_Representantes] FOREIGN KEY([RepresentanteId])
REFERENCES [dbo].[Representantes] ([RepresentanteId])
GO
ALTER TABLE [dbo].[ContactoRepresentante] CHECK CONSTRAINT [FK_ContactoRepresentante_Representantes]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente]  WITH CHECK ADD  CONSTRAINT [FK_ContactoTrabajoDependiente_Contactos] FOREIGN KEY([ContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] CHECK CONSTRAINT [FK_ContactoTrabajoDependiente_Contactos]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente]  WITH CHECK ADD  CONSTRAINT [FK_ContactoTrabajoDependiente_EmpresaContacto] FOREIGN KEY([EmpresaContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] CHECK CONSTRAINT [FK_ContactoTrabajoDependiente_EmpresaContacto]
GO
ALTER TABLE [dbo].[Direcciones]  WITH CHECK ADD  CONSTRAINT [FK_Direcciones_Contactos] FOREIGN KEY([IdContacto])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[Direcciones] CHECK CONSTRAINT [FK_Direcciones_Contactos]
GO
ALTER TABLE [dbo].[Direcciones]  WITH CHECK ADD  CONSTRAINT [FK_Direcciones_Distritos] FOREIGN KEY([IdDistrito])
REFERENCES [dbo].[Distritos] ([IdDistrito])
GO
ALTER TABLE [dbo].[Direcciones] CHECK CONSTRAINT [FK_Direcciones_Distritos]
GO
ALTER TABLE [dbo].[Distritos]  WITH CHECK ADD  CONSTRAINT [FK_Distritos_Provincias] FOREIGN KEY([IdProvincia])
REFERENCES [dbo].[Provincias] ([IdProvincia])
GO
ALTER TABLE [dbo].[Distritos] CHECK CONSTRAINT [FK_Distritos_Provincias]
GO
ALTER TABLE [dbo].[Notas]  WITH CHECK ADD  CONSTRAINT [FK_Notas_Contactos] FOREIGN KEY([ContactoId])
REFERENCES [dbo].[Contactos] ([Id])
GO
ALTER TABLE [dbo].[Notas] CHECK CONSTRAINT [FK_Notas_Contactos]
GO
ALTER TABLE [dbo].[Provincias]  WITH CHECK ADD  CONSTRAINT [FK_Provincias_Departamentos] FOREIGN KEY([IdDepartamento])
REFERENCES [dbo].[Departamentos] ([IdDepartamento])
GO
ALTER TABLE [dbo].[Provincias] CHECK CONSTRAINT [FK_Provincias_Departamentos]
GO
ALTER TABLE [dbo].[ReporteRoles]  WITH CHECK ADD  CONSTRAINT [FK_ReporteRoles_Reportes] FOREIGN KEY([ReporteId])
REFERENCES [dbo].[Reportes] ([ReporteId])
GO
ALTER TABLE [dbo].[ReporteRoles] CHECK CONSTRAINT [FK_ReporteRoles_Reportes]
GO
ALTER TABLE [dbo].[Actividades]  WITH CHECK ADD  CONSTRAINT [CK_Actividades_TipoActividad] CHECK  (([TipoActividad]='OTRO' OR [TipoActividad]='REUNION' OR [TipoActividad]='CORREO' OR [TipoActividad]='WHATSAPP' OR [TipoActividad]='LLAMADA'))
GO
ALTER TABLE [dbo].[Actividades] CHECK CONSTRAINT [CK_Actividades_TipoActividad]
GO
ALTER TABLE [dbo].[ContactoActividad]  WITH CHECK ADD  CONSTRAINT [CK_ContactoActividad_GradoInstruccion] CHECK  (([GradoInstruccion]='SUPERIOR' OR [GradoInstruccion]='TECNICO' OR [GradoInstruccion] IS NULL))
GO
ALTER TABLE [dbo].[ContactoActividad] CHECK CONSTRAINT [CK_ContactoActividad_GradoInstruccion]
GO
ALTER TABLE [dbo].[Contactos]  WITH CHECK ADD  CONSTRAINT [CK_Contactos_EstadoContacto] CHECK  (([EstadoContacto]='INACTIVO' OR [EstadoContacto]='ACTIVO'))
GO
ALTER TABLE [dbo].[Contactos] CHECK CONSTRAINT [CK_Contactos_EstadoContacto]
GO
ALTER TABLE [dbo].[Contactos]  WITH CHECK ADD  CONSTRAINT [CK_Contactos_Identificacion_Coherente] CHECK  (([TipoContacto]='NATURAL' AND [Nombres] IS NOT NULL AND [Apellidos] IS NOT NULL AND [RazonSocial] IS NULL OR [TipoContacto]='JURIDICA' AND [RazonSocial] IS NOT NULL AND [Nombres] IS NULL AND [Apellidos] IS NULL))
GO
ALTER TABLE [dbo].[Contactos] CHECK CONSTRAINT [CK_Contactos_Identificacion_Coherente]
GO
ALTER TABLE [dbo].[Contactos]  WITH CHECK ADD  CONSTRAINT [CK_Contactos_Sexo] CHECK  (([Sexo]='FEMENINO' OR [Sexo]='MASCULINO' OR [Sexo] IS NULL))
GO
ALTER TABLE [dbo].[Contactos] CHECK CONSTRAINT [CK_Contactos_Sexo]
GO
ALTER TABLE [dbo].[Contactos]  WITH CHECK ADD  CONSTRAINT [CK_Contactos_TipoContacto] CHECK  (([TipoContacto]='JURIDICA' OR [TipoContacto]='NATURAL'))
GO
ALTER TABLE [dbo].[Contactos] CHECK CONSTRAINT [CK_Contactos_TipoContacto]
GO
ALTER TABLE [dbo].[Contactos]  WITH CHECK ADD  CONSTRAINT [CK_Contactos_TipoDocumento_Coherente] CHECK  (([TipoContacto]='NATURAL' AND ([TipoDocumento]='PASAPORTE' OR [TipoDocumento]='CE' OR [TipoDocumento]='DNI') OR [TipoContacto]='JURIDICA' AND [TipoDocumento]='RUC'))
GO
ALTER TABLE [dbo].[Contactos] CHECK CONSTRAINT [CK_Contactos_TipoDocumento_Coherente]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente]  WITH CHECK ADD  CONSTRAINT [CK_ContactoTrabajoDependiente_Empresa] CHECK  (([EmpresaContactoId] IS NOT NULL AND [EmpresaNombreLibre] IS NULL OR [EmpresaContactoId] IS NULL AND [EmpresaNombreLibre] IS NOT NULL))
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] CHECK CONSTRAINT [CK_ContactoTrabajoDependiente_Empresa]
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente]  WITH CHECK ADD  CONSTRAINT [CK_ContactoTrabajoDependiente_Fechas] CHECK  (([Hasta] IS NULL OR [Hasta]>=[Desde]))
GO
ALTER TABLE [dbo].[ContactoTrabajoDependiente] CHECK CONSTRAINT [CK_ContactoTrabajoDependiente_Fechas]
GO
ALTER TABLE [dbo].[Representantes]  WITH CHECK ADD  CONSTRAINT [CK_Representantes_TipoDocumento] CHECK  (([TipoDocumento]='PASAPORTE' OR [TipoDocumento]='CE' OR [TipoDocumento]='DNI'))
GO
ALTER TABLE [dbo].[Representantes] CHECK CONSTRAINT [CK_Representantes_TipoDocumento]
GO
GO
