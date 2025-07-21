-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.campañas (
  id integer NOT NULL DEFAULT nextval('"campañas_id_seq"'::regclass),
  nombre character varying NOT NULL,
  plataforma character varying,
  CONSTRAINT campañas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.devolucion_archivos (
  id integer NOT NULL DEFAULT nextval('devolucion_archivos_id_seq'::regclass),
  devolucion_id integer,
  ruta_archivo text NOT NULL,
  nombre_archivo character varying,
  fecha_subida timestamp without time zone DEFAULT now(),
  CONSTRAINT devolucion_archivos_pkey PRIMARY KEY (id),
  CONSTRAINT devolucion_archivos_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones(id)
);
CREATE TABLE public.devoluciones (
  id integer NOT NULL DEFAULT nextval('devoluciones_id_seq'::regclass),
  lead_id integer,
  usuario_id uuid,
  motivo_id integer,
  comentario_empresa text,
  fecha_solicitud timestamp without time zone DEFAULT now(),
  estado character varying DEFAULT 'pendiente'::character varying,
  comentario_admin text,
  fecha_resolucion timestamp without time zone,
  CONSTRAINT devoluciones_pkey PRIMARY KEY (id),
  CONSTRAINT devoluciones_motivo_id_fkey FOREIGN KEY (motivo_id) REFERENCES public.motivos_devolucion(id),
  CONSTRAINT devoluciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT devoluciones_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.empresa_campañas (
  id integer NOT NULL DEFAULT nextval('"empresa_campañas_id_seq"'::regclass),
  empresa_id integer NOT NULL,
  campaña_id integer NOT NULL,
  CONSTRAINT empresa_campañas_pkey PRIMARY KEY (id),
  CONSTRAINT empresa_campañas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT empresa_campañas_campaña_id_fkey FOREIGN KEY (campaña_id) REFERENCES public.campañas(id)
);
CREATE TABLE public.empresa_hubs (
  id integer NOT NULL DEFAULT nextval('empresa_hubs_id_seq'::regclass),
  empresa_id integer NOT NULL,
  hub_id integer NOT NULL,
  CONSTRAINT empresa_hubs_pkey PRIMARY KEY (id),
  CONSTRAINT empresa_hubs_hub_id_fkey FOREIGN KEY (hub_id) REFERENCES public.hubs(id),
  CONSTRAINT empresa_hubs_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
);
CREATE TABLE public.empresas (
  id integer NOT NULL DEFAULT nextval('empresas_id_seq'::regclass),
  nombre character varying NOT NULL,
  email_contacto character varying,
  volumen_diario integer DEFAULT 0,
  prioridad integer DEFAULT 3 CHECK (prioridad >= 1 AND prioridad <= 5),
  activa boolean DEFAULT true,
  url_recepcion_leads text,
  cif character varying NOT NULL UNIQUE,
  CONSTRAINT empresas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hubs (
  id integer NOT NULL DEFAULT nextval('hubs_id_seq'::regclass),
  nombre character varying NOT NULL,
  CONSTRAINT hubs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leads (
  id integer NOT NULL DEFAULT nextval('leads_id_seq'::regclass),
  nombre_cliente character varying NOT NULL,
  telefono character varying NOT NULL,
  campaña_id integer,
  fecha_entrada timestamp without time zone NOT NULL DEFAULT now(),
  fecha_asignacion timestamp without time zone,
  empresa_id integer,
  hub_id integer,
  plataforma character varying,
  estado_temporal character varying,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT leads_campaña_id_fkey FOREIGN KEY (campaña_id) REFERENCES public.campañas(id),
  CONSTRAINT leads_hub_id_fkey FOREIGN KEY (hub_id) REFERENCES public.hubs(id)
);
CREATE TABLE public.logs_leads (
  id integer NOT NULL DEFAULT nextval('logs_leads_id_seq'::regclass),
  lead_id integer,
  usuario_id uuid,
  accion character varying NOT NULL,
  fecha timestamp without time zone DEFAULT now(),
  detalle jsonb,
  CONSTRAINT logs_leads_pkey PRIMARY KEY (id),
  CONSTRAINT logs_leads_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT logs_leads_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);
CREATE TABLE public.motivos_devolucion (
  id integer NOT NULL DEFAULT nextval('motivos_devolucion_id_seq'::regclass),
  descripcion character varying NOT NULL,
  CONSTRAINT motivos_devolucion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  empresa_id integer,
  nombre character varying,
  es_admin boolean DEFAULT false,
  fecha_creacion timestamp without time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);