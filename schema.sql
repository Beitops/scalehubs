-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.campañas (
  meta_plataforma_id text,
  nombre character varying NOT NULL,
  plataforma character varying,
  id integer NOT NULL DEFAULT nextval('"campañas_id_seq"'::regclass),
  CONSTRAINT campañas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.devolucion_archivos (
  devolucion_id integer,
  ruta_archivo text NOT NULL,
  nombre_archivo character varying,
  id integer NOT NULL DEFAULT nextval('devolucion_archivos_id_seq'::regclass),
  fecha_subida timestamp without time zone DEFAULT now(),
  CONSTRAINT devolucion_archivos_pkey PRIMARY KEY (id),
  CONSTRAINT devolucion_archivos_devolucion_id_fkey FOREIGN KEY (devolucion_id) REFERENCES public.devoluciones(id)
);
CREATE TABLE public.devoluciones (
  lead_id integer,
  usuario_id uuid,
  motivo_id integer,
  comentario_empresa text,
  comentario_admin text,
  fecha_resolucion timestamp without time zone,
  id integer NOT NULL DEFAULT nextval('devoluciones_id_seq'::regclass),
  fecha_solicitud timestamp without time zone DEFAULT now(),
  estado character varying DEFAULT 'pendiente'::character varying,
  CONSTRAINT devoluciones_pkey PRIMARY KEY (id),
  CONSTRAINT devoluciones_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT devoluciones_motivo_id_fkey FOREIGN KEY (motivo_id) REFERENCES public.motivos_devolucion(id),
  CONSTRAINT devoluciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.empresa_campañas (
  empresa_id integer NOT NULL,
  campaña_id integer NOT NULL,
  id integer NOT NULL DEFAULT nextval('"empresa_campañas_id_seq"'::regclass),
  CONSTRAINT empresa_campañas_pkey PRIMARY KEY (id),
  CONSTRAINT empresa_campañas_campaña_id_fkey FOREIGN KEY (campaña_id) REFERENCES public.campañas(id),
  CONSTRAINT empresa_campañas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
);
CREATE TABLE public.empresa_hubs (
  empresa_id integer NOT NULL,
  hub_id integer NOT NULL,
  id integer NOT NULL DEFAULT nextval('empresa_hubs_id_seq'::regclass),
  CONSTRAINT empresa_hubs_pkey PRIMARY KEY (id),
  CONSTRAINT empresa_hubs_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT empresa_hubs_hub_id_fkey FOREIGN KEY (hub_id) REFERENCES public.hubs(id)
);
CREATE TABLE public.empresas (
  cif character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  email_contacto character varying,
  url_recepcion_leads text,
  id integer NOT NULL DEFAULT nextval('empresas_id_seq'::regclass),
  volumen_diario integer DEFAULT 0,
  prioridad integer DEFAULT 3 CHECK (prioridad >= 1 AND prioridad <= 5),
  activa boolean DEFAULT true,
  CONSTRAINT empresas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hubs (
  nombre character varying NOT NULL,
  id integer NOT NULL DEFAULT nextval('hubs_id_seq'::regclass),
  CONSTRAINT hubs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leads (
  estado_temporal character varying,
  plataforma_lead_id text,
  nombre_cliente character varying NOT NULL,
  telefono character varying NOT NULL,
  campaña_id integer,
  fecha_asignacion timestamp without time zone,
  empresa_id integer,
  hub_id integer,
  plataforma character varying,
  id integer NOT NULL DEFAULT nextval('leads_id_seq'::regclass),
  fecha_entrada timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_hub_id_fkey FOREIGN KEY (hub_id) REFERENCES public.hubs(id),
  CONSTRAINT leads_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id),
  CONSTRAINT leads_campaña_id_fkey FOREIGN KEY (campaña_id) REFERENCES public.campañas(id)
);
CREATE TABLE public.logs_leads (
  lead_id integer,
  usuario_id uuid,
  accion character varying NOT NULL,
  detalle jsonb,
  id integer NOT NULL DEFAULT nextval('logs_leads_id_seq'::regclass),
  fecha timestamp without time zone DEFAULT now(),
  CONSTRAINT logs_leads_pkey PRIMARY KEY (id),
  CONSTRAINT logs_leads_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT logs_leads_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.motivos_devolucion (
  descripcion character varying NOT NULL,
  id integer NOT NULL DEFAULT nextval('motivos_devolucion_id_seq'::regclass),
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