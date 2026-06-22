--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.weight_logs DROP CONSTRAINT IF EXISTS weight_logs_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminders DROP CONSTRAINT IF EXISTS reminders_trigger_place_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reminders DROP CONSTRAINT IF EXISTS reminders_trigger_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.record_sequences DROP CONSTRAINT IF EXISTS record_sequences_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.receipts DROP CONSTRAINT IF EXISTS receipts_place_id_fkey;
ALTER TABLE IF EXISTS ONLY public.receipts DROP CONSTRAINT IF EXISTS receipts_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.receipt_items DROP CONSTRAINT IF EXISTS receipt_items_record_r_number_fkey;
ALTER TABLE IF EXISTS ONLY public.place_aliases DROP CONSTRAINT IF EXISTS place_aliases_place_id_fkey;
ALTER TABLE IF EXISTS ONLY public.people_aliases DROP CONSTRAINT IF EXISTS people_aliases_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_record_i_number_fkey;
ALTER TABLE IF EXISTS ONLY public.inactive_company_name_blocks DROP CONSTRAINT IF EXISTS inactive_company_name_blocks_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.health_records DROP CONSTRAINT IF EXISTS health_records_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.health_psa_free_psa DROP CONSTRAINT IF EXISTS health_psa_free_psa_record_hr_number_fkey;
ALTER TABLE IF EXISTS ONLY public.health_head_neck_mri_mra_screening DROP CONSTRAINT IF EXISTS health_head_neck_mri_mra_screening_record_hr_number_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_place_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_parent_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.event_receipts DROP CONSTRAINT IF EXISTS event_receipts_record_r_number_fkey;
ALTER TABLE IF EXISTS ONLY public.event_receipts DROP CONSTRAINT IF EXISTS event_receipts_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.event_people DROP CONSTRAINT IF EXISTS event_people_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.event_people DROP CONSTRAINT IF EXISTS event_people_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.entity_aliases DROP CONSTRAINT IF EXISTS entity_aliases_entity_id_fkey;
ALTER TABLE IF EXISTS ONLY public.blood_pressure_logs DROP CONSTRAINT IF EXISTS blood_pressure_logs_person_id_fkey;
ALTER TABLE IF EXISTS ONLY public.weight_logs DROP CONSTRAINT IF EXISTS weight_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.reminders DROP CONSTRAINT IF EXISTS reminders_pkey;
ALTER TABLE IF EXISTS ONLY public.record_sequences DROP CONSTRAINT IF EXISTS record_sequences_pkey;
ALTER TABLE IF EXISTS ONLY public.receipts DROP CONSTRAINT IF EXISTS receipts_record_r_number_key;
ALTER TABLE IF EXISTS ONLY public.receipts DROP CONSTRAINT IF EXISTS receipts_pkey;
ALTER TABLE IF EXISTS ONLY public.receipt_items DROP CONSTRAINT IF EXISTS receipt_items_pkey;
ALTER TABLE IF EXISTS ONLY public.receipt_item_categories DROP CONSTRAINT IF EXISTS receipt_item_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.receipt_item_categories DROP CONSTRAINT IF EXISTS receipt_item_categories_name_key;
ALTER TABLE IF EXISTS ONLY public.receipt_categories DROP CONSTRAINT IF EXISTS receipt_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.places DROP CONSTRAINT IF EXISTS places_pkey;
ALTER TABLE IF EXISTS ONLY public.places DROP CONSTRAINT IF EXISTS places_canonical_name_key;
ALTER TABLE IF EXISTS ONLY public.place_aliases DROP CONSTRAINT IF EXISTS place_aliases_pkey;
ALTER TABLE IF EXISTS ONLY public.people DROP CONSTRAINT IF EXISTS people_pkey;
ALTER TABLE IF EXISTS ONLY public.people DROP CONSTRAINT IF EXISTS people_canonical_name_key;
ALTER TABLE IF EXISTS ONLY public.people_aliases DROP CONSTRAINT IF EXISTS people_aliases_pkey;
ALTER TABLE IF EXISTS ONLY public.item_categories DROP CONSTRAINT IF EXISTS item_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_record_i_number_key;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_item_categories DROP CONSTRAINT IF EXISTS invoice_item_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_item_categories DROP CONSTRAINT IF EXISTS invoice_item_categories_name_key;
ALTER TABLE IF EXISTS ONLY public.invoice_categories DROP CONSTRAINT IF EXISTS invoice_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.invoice_categories DROP CONSTRAINT IF EXISTS invoice_categories_name_key;
ALTER TABLE IF EXISTS ONLY public.inactive_company_name_blocks DROP CONSTRAINT IF EXISTS inactive_company_name_blocks_pkey;
ALTER TABLE IF EXISTS ONLY public.inactive_company_name_blocks DROP CONSTRAINT IF EXISTS inactive_company_name_blocks_normalized_name_key;
ALTER TABLE IF EXISTS ONLY public.health_type_schemas DROP CONSTRAINT IF EXISTS health_type_schemas_pkey;
ALTER TABLE IF EXISTS ONLY public.health_sequences DROP CONSTRAINT IF EXISTS health_sequences_pkey;
ALTER TABLE IF EXISTS ONLY public.health_records DROP CONSTRAINT IF EXISTS health_records_record_hr_number_key;
ALTER TABLE IF EXISTS ONLY public.health_records DROP CONSTRAINT IF EXISTS health_records_pkey;
ALTER TABLE IF EXISTS ONLY public.health_head_neck_mri_mra_screening DROP CONSTRAINT IF EXISTS health_head_neck_mri_mra_screening_pkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.event_receipts DROP CONSTRAINT IF EXISTS event_receipts_pkey;
ALTER TABLE IF EXISTS ONLY public.event_people DROP CONSTRAINT IF EXISTS event_people_pkey;
ALTER TABLE IF EXISTS ONLY public.entity_aliases DROP CONSTRAINT IF EXISTS entity_aliases_pkey;
ALTER TABLE IF EXISTS ONLY public.entities DROP CONSTRAINT IF EXISTS entities_short_code_key;
ALTER TABLE IF EXISTS ONLY public.entities DROP CONSTRAINT IF EXISTS entities_pkey;
ALTER TABLE IF EXISTS ONLY public.entities DROP CONSTRAINT IF EXISTS entities_name_key;
ALTER TABLE IF EXISTS ONLY public.blood_pressure_logs DROP CONSTRAINT IF EXISTS blood_pressure_logs_pkey;
ALTER TABLE IF EXISTS public.weight_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reminders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.receipts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.receipt_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.receipt_item_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.places ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.people ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoice_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoice_item_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoice_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.health_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.health_head_neck_mri_mra_screening ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.events ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.entities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.blood_pressure_logs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.weight_logs_id_seq;
DROP TABLE IF EXISTS public.weight_logs;
DROP SEQUENCE IF EXISTS public.reminders_id_seq;
DROP TABLE IF EXISTS public.reminders;
DROP TABLE IF EXISTS public.record_sequences;
DROP SEQUENCE IF EXISTS public.receipts_id_seq;
DROP TABLE IF EXISTS public.receipts;
DROP SEQUENCE IF EXISTS public.receipt_items_id_seq;
DROP TABLE IF EXISTS public.receipt_items;
DROP SEQUENCE IF EXISTS public.receipt_item_categories_id_seq;
DROP TABLE IF EXISTS public.receipt_item_categories;
DROP TABLE IF EXISTS public.receipt_categories;
DROP SEQUENCE IF EXISTS public.places_id_seq;
DROP TABLE IF EXISTS public.places;
DROP TABLE IF EXISTS public.place_aliases;
DROP SEQUENCE IF EXISTS public.people_id_seq;
DROP TABLE IF EXISTS public.people_aliases;
DROP TABLE IF EXISTS public.people;
DROP TABLE IF EXISTS public.item_categories;
DROP SEQUENCE IF EXISTS public.invoices_id_seq;
DROP TABLE IF EXISTS public.invoices;
DROP SEQUENCE IF EXISTS public.invoice_items_id_seq;
DROP TABLE IF EXISTS public.invoice_items;
DROP SEQUENCE IF EXISTS public.invoice_item_categories_id_seq;
DROP TABLE IF EXISTS public.invoice_item_categories;
DROP SEQUENCE IF EXISTS public.invoice_categories_id_seq;
DROP TABLE IF EXISTS public.invoice_categories;
DROP TABLE IF EXISTS public.inactive_company_name_blocks;
DROP TABLE IF EXISTS public.health_type_schemas;
DROP TABLE IF EXISTS public.health_sequences;
DROP SEQUENCE IF EXISTS public.health_records_id_seq;
DROP TABLE IF EXISTS public.health_records;
DROP TABLE IF EXISTS public.health_psa_free_psa;
DROP SEQUENCE IF EXISTS public.health_head_neck_mri_mra_screening_id_seq;
DROP TABLE IF EXISTS public.health_head_neck_mri_mra_screening;
DROP SEQUENCE IF EXISTS public.events_id_seq;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.event_receipts;
DROP TABLE IF EXISTS public.event_people;
DROP TABLE IF EXISTS public.entity_aliases;
DROP SEQUENCE IF EXISTS public.entities_id_seq;
DROP TABLE IF EXISTS public.entities;
DROP SEQUENCE IF EXISTS public.blood_pressure_logs_id_seq;
DROP TABLE IF EXISTS public.blood_pressure_logs;
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blood_pressure_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blood_pressure_logs (
    id integer NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    log_time time without time zone DEFAULT CURRENT_TIME,
    person_id integer,
    systolic integer NOT NULL,
    diastolic integer NOT NULL,
    pulse integer,
    arm text,
    "position" text,
    device text,
    extra_readings jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blood_pressure_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blood_pressure_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blood_pressure_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blood_pressure_logs_id_seq OWNED BY public.blood_pressure_logs.id;


--
-- Name: entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entities (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    short_code text NOT NULL,
    currency text DEFAULT 'CAD'::text NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entities_id_seq OWNED BY public.entities.id;


--
-- Name: entity_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_aliases (
    alias text NOT NULL,
    entity_id integer NOT NULL
);


--
-- Name: event_people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_people (
    event_id integer NOT NULL,
    person_id integer NOT NULL
);


--
-- Name: event_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_receipts (
    event_id integer NOT NULL,
    record_r_number text NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id integer NOT NULL,
    event_type text NOT NULL,
    event_date date DEFAULT CURRENT_DATE NOT NULL,
    checkin_at timestamp with time zone,
    checkout_at timestamp with time zone,
    duration_minutes integer,
    parent_event_id integer,
    place_id integer,
    title text,
    notes text,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: health_head_neck_mri_mra_screening; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_head_neck_mri_mra_screening (
    id integer NOT NULL,
    record_hr_number text NOT NULL,
    exam_name text,
    imaging_modality text,
    body_parts text,
    brain_cortical_atrophy text,
    white_matter_lesions text,
    right_proximal_vertebral_artery_stenosis text,
    management_recommendation text,
    abnormal_items jsonb DEFAULT '[]'::jsonb,
    normal_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_head_neck_mri_mra_screening_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_head_neck_mri_mra_screening_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_head_neck_mri_mra_screening_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_head_neck_mri_mra_screening_id_seq OWNED BY public.health_head_neck_mri_mra_screening.id;


--
-- Name: health_psa_free_psa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_psa_free_psa (
    record_hr_number text NOT NULL,
    psa_free_ng_ml numeric,
    psa_total_ng_ml numeric,
    free_psa_ratio_percent numeric,
    psa_reference_min_ng_ml numeric,
    psa_reference_max_ng_ml numeric,
    ft_ratio_reference_percent text,
    method text,
    report_time timestamp with time zone,
    print_time timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_records (
    id integer NOT NULL,
    record_hr_number text NOT NULL,
    record_type text NOT NULL,
    record_date date NOT NULL,
    title text NOT NULL,
    facility text,
    doctor text,
    patient_name text,
    person_id integer,
    tags text[],
    key_terms text[],
    summary text,
    ai_interpretation text,
    attachment_link text,
    source_filename text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: health_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_records_id_seq OWNED BY public.health_records.id;


--
-- Name: health_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_sequences (
    year integer NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: health_type_schemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_type_schemas (
    record_type text NOT NULL,
    table_name text NOT NULL,
    columns_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inactive_company_name_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inactive_company_name_blocks (
    id integer NOT NULL,
    entity_id integer,
    blocked_name text NOT NULL,
    normalized_name text NOT NULL,
    reason text DEFAULT 'Inactive company name should not be reused for a new company'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inactive_company_name_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inactive_company_name_blocks ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inactive_company_name_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoice_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_categories_id_seq OWNED BY public.invoice_categories.id;


--
-- Name: invoice_item_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_item_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_item_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_item_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_item_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_item_categories_id_seq OWNED BY public.invoice_item_categories.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    record_i_number text NOT NULL,
    invoice_number text,
    item_date date,
    item_number text,
    item_name text NOT NULL,
    item_category text,
    item_qty numeric(10,3),
    item_price numeric(10,2),
    item_total_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    entity_id integer DEFAULT 1 NOT NULL,
    record_i_number text NOT NULL,
    invoice_number text,
    invoice_date date NOT NULL,
    buyer_name text NOT NULL,
    person_id integer,
    category text,
    subtotal numeric(10,2),
    taxes jsonb DEFAULT '[]'::jsonb NOT NULL,
    grand_total numeric(10,2),
    currency text DEFAULT 'CAD'::text NOT NULL,
    payment_method text,
    attachment_link text,
    is_reviewed boolean DEFAULT false NOT NULL,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: item_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_categories (
    name text NOT NULL
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id integer NOT NULL,
    canonical_name text NOT NULL,
    relationship text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: people_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people_aliases (
    alias text NOT NULL,
    person_id integer NOT NULL,
    language text
);


--
-- Name: people_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.people_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: people_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.people_id_seq OWNED BY public.people.id;


--
-- Name: place_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_aliases (
    alias text NOT NULL,
    place_id integer NOT NULL,
    language text
);


--
-- Name: places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.places (
    id integer NOT NULL,
    canonical_name text NOT NULL,
    formal_name text,
    address text,
    gps_lat numeric(10,7),
    gps_lng numeric(10,7),
    gps_radius_m integer DEFAULT 100,
    category text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: places_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.places_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: places_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.places_id_seq OWNED BY public.places.id;


--
-- Name: receipt_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_categories (
    name text NOT NULL
);


--
-- Name: receipt_item_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_item_categories (
    id bigint NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: receipt_item_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_item_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_item_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_item_categories_id_seq OWNED BY public.receipt_item_categories.id;


--
-- Name: receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_items (
    id integer NOT NULL,
    record_r_number text NOT NULL,
    receipt_number text,
    item_date date,
    item_name text NOT NULL,
    adjusted_item_name text,
    item_category text NOT NULL,
    item_qty numeric(10,3),
    item_price numeric(10,2),
    item_total_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_items_id_seq OWNED BY public.receipt_items.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    entity_id integer DEFAULT 1 NOT NULL,
    record_r_number text NOT NULL,
    vendor text NOT NULL,
    vendor_address text,
    vendor_phone text,
    store_number text,
    place_id integer,
    receipt_number text,
    transaction_number text,
    authorization_code text,
    card_last_four text,
    cashier text,
    receipt_date date NOT NULL,
    receipt_time time without time zone,
    invoice_number text,
    category text NOT NULL,
    subtotal numeric(10,2),
    taxes jsonb DEFAULT '[]'::jsonb NOT NULL,
    tips numeric(10,2),
    grand_total numeric(10,2),
    currency text DEFAULT 'CAD'::text NOT NULL,
    payment_method text,
    attachment_link text,
    source_filename text,
    photo_taken_at timestamp with time zone,
    photo_gps_lat numeric(10,7),
    photo_gps_lng numeric(10,7),
    is_reviewed boolean DEFAULT false NOT NULL,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_file_size bigint,
    uploaded_mime_type text
);


--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: record_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_sequences (
    entity_id integer NOT NULL,
    record_type text NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminders (
    id integer NOT NULL,
    reminder_text text NOT NULL,
    reminder_type text NOT NULL,
    trigger_date date,
    trigger_month integer,
    trigger_day integer,
    trigger_person_id integer,
    trigger_place_id integer,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_pattern text,
    is_active boolean DEFAULT true NOT NULL,
    triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reminders_id_seq OWNED BY public.reminders.id;


--
-- Name: weight_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weight_logs (
    id integer NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    log_time time without time zone,
    person_id integer,
    weight_kg numeric(5,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weight_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.weight_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: weight_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.weight_logs_id_seq OWNED BY public.weight_logs.id;


--
-- Name: blood_pressure_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blood_pressure_logs ALTER COLUMN id SET DEFAULT nextval('public.blood_pressure_logs_id_seq'::regclass);


--
-- Name: entities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities ALTER COLUMN id SET DEFAULT nextval('public.entities_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: health_head_neck_mri_mra_screening id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_head_neck_mri_mra_screening ALTER COLUMN id SET DEFAULT nextval('public.health_head_neck_mri_mra_screening_id_seq'::regclass);


--
-- Name: health_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records ALTER COLUMN id SET DEFAULT nextval('public.health_records_id_seq'::regclass);


--
-- Name: invoice_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_categories ALTER COLUMN id SET DEFAULT nextval('public.invoice_categories_id_seq'::regclass);


--
-- Name: invoice_item_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_item_categories ALTER COLUMN id SET DEFAULT nextval('public.invoice_item_categories_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: people id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people ALTER COLUMN id SET DEFAULT nextval('public.people_id_seq'::regclass);


--
-- Name: places id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places ALTER COLUMN id SET DEFAULT nextval('public.places_id_seq'::regclass);


--
-- Name: receipt_item_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_item_categories ALTER COLUMN id SET DEFAULT nextval('public.receipt_item_categories_id_seq'::regclass);


--
-- Name: receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items ALTER COLUMN id SET DEFAULT nextval('public.receipt_items_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- Name: weight_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_logs ALTER COLUMN id SET DEFAULT nextval('public.weight_logs_id_seq'::regclass);


--
-- Name: blood_pressure_logs blood_pressure_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blood_pressure_logs
    ADD CONSTRAINT blood_pressure_logs_pkey PRIMARY KEY (id);


--
-- Name: entities entities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_name_key UNIQUE (name);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entities entities_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_short_code_key UNIQUE (short_code);


--
-- Name: entity_aliases entity_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases
    ADD CONSTRAINT entity_aliases_pkey PRIMARY KEY (alias);


--
-- Name: event_people event_people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_pkey PRIMARY KEY (event_id, person_id);


--
-- Name: event_receipts event_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_receipts
    ADD CONSTRAINT event_receipts_pkey PRIMARY KEY (event_id, record_r_number);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: health_head_neck_mri_mra_screening health_head_neck_mri_mra_screening_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_head_neck_mri_mra_screening
    ADD CONSTRAINT health_head_neck_mri_mra_screening_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_pkey PRIMARY KEY (id);


--
-- Name: health_records health_records_record_hr_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_record_hr_number_key UNIQUE (record_hr_number);


--
-- Name: health_sequences health_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_sequences
    ADD CONSTRAINT health_sequences_pkey PRIMARY KEY (year);


--
-- Name: health_type_schemas health_type_schemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_type_schemas
    ADD CONSTRAINT health_type_schemas_pkey PRIMARY KEY (record_type);


--
-- Name: inactive_company_name_blocks inactive_company_name_blocks_normalized_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inactive_company_name_blocks
    ADD CONSTRAINT inactive_company_name_blocks_normalized_name_key UNIQUE (normalized_name);


--
-- Name: inactive_company_name_blocks inactive_company_name_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inactive_company_name_blocks
    ADD CONSTRAINT inactive_company_name_blocks_pkey PRIMARY KEY (id);


--
-- Name: invoice_categories invoice_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_categories
    ADD CONSTRAINT invoice_categories_name_key UNIQUE (name);


--
-- Name: invoice_categories invoice_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_categories
    ADD CONSTRAINT invoice_categories_pkey PRIMARY KEY (id);


--
-- Name: invoice_item_categories invoice_item_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_item_categories
    ADD CONSTRAINT invoice_item_categories_name_key UNIQUE (name);


--
-- Name: invoice_item_categories invoice_item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_item_categories
    ADD CONSTRAINT invoice_item_categories_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_record_i_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_record_i_number_key UNIQUE (record_i_number);


--
-- Name: item_categories item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_pkey PRIMARY KEY (name);


--
-- Name: people_aliases people_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people_aliases
    ADD CONSTRAINT people_aliases_pkey PRIMARY KEY (alias);


--
-- Name: people people_canonical_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_canonical_name_key UNIQUE (canonical_name);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: place_aliases place_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_aliases
    ADD CONSTRAINT place_aliases_pkey PRIMARY KEY (alias);


--
-- Name: places places_canonical_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_canonical_name_key UNIQUE (canonical_name);


--
-- Name: places places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: receipt_categories receipt_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_categories
    ADD CONSTRAINT receipt_categories_pkey PRIMARY KEY (name);


--
-- Name: receipt_item_categories receipt_item_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_item_categories
    ADD CONSTRAINT receipt_item_categories_name_key UNIQUE (name);


--
-- Name: receipt_item_categories receipt_item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_item_categories
    ADD CONSTRAINT receipt_item_categories_pkey PRIMARY KEY (id);


--
-- Name: receipt_items receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_record_r_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_record_r_number_key UNIQUE (record_r_number);


--
-- Name: record_sequences record_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_sequences
    ADD CONSTRAINT record_sequences_pkey PRIMARY KEY (entity_id, record_type);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: weight_logs weight_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_logs
    ADD CONSTRAINT weight_logs_pkey PRIMARY KEY (id);


--
-- Name: blood_pressure_logs blood_pressure_logs_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blood_pressure_logs
    ADD CONSTRAINT blood_pressure_logs_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: entity_aliases entity_aliases_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases
    ADD CONSTRAINT entity_aliases_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: event_people event_people_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_people event_people_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: event_receipts event_receipts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_receipts
    ADD CONSTRAINT event_receipts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_receipts event_receipts_record_r_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_receipts
    ADD CONSTRAINT event_receipts_record_r_number_fkey FOREIGN KEY (record_r_number) REFERENCES public.receipts(record_r_number) ON DELETE CASCADE;


--
-- Name: events events_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES public.events(id);


--
-- Name: events events_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id);


--
-- Name: health_head_neck_mri_mra_screening health_head_neck_mri_mra_screening_record_hr_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_head_neck_mri_mra_screening
    ADD CONSTRAINT health_head_neck_mri_mra_screening_record_hr_number_fkey FOREIGN KEY (record_hr_number) REFERENCES public.health_records(record_hr_number);


--
-- Name: health_psa_free_psa health_psa_free_psa_record_hr_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_psa_free_psa
    ADD CONSTRAINT health_psa_free_psa_record_hr_number_fkey FOREIGN KEY (record_hr_number) REFERENCES public.health_records(record_hr_number);


--
-- Name: health_records health_records_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_records
    ADD CONSTRAINT health_records_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: inactive_company_name_blocks inactive_company_name_blocks_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inactive_company_name_blocks
    ADD CONSTRAINT inactive_company_name_blocks_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: invoice_items invoice_items_record_i_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_record_i_number_fkey FOREIGN KEY (record_i_number) REFERENCES public.invoices(record_i_number) ON DELETE CASCADE;


--
-- Name: invoices invoices_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: invoices invoices_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: people_aliases people_aliases_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people_aliases
    ADD CONSTRAINT people_aliases_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: place_aliases place_aliases_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_aliases
    ADD CONSTRAINT place_aliases_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;


--
-- Name: receipt_items receipt_items_record_r_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_record_r_number_fkey FOREIGN KEY (record_r_number) REFERENCES public.receipts(record_r_number) ON DELETE CASCADE;


--
-- Name: receipts receipts_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: receipts receipts_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id);


--
-- Name: record_sequences record_sequences_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_sequences
    ADD CONSTRAINT record_sequences_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id);


--
-- Name: reminders reminders_trigger_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_trigger_person_id_fkey FOREIGN KEY (trigger_person_id) REFERENCES public.people(id);


--
-- Name: reminders reminders_trigger_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_trigger_place_id_fkey FOREIGN KEY (trigger_place_id) REFERENCES public.places(id);


--
-- Name: weight_logs weight_logs_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weight_logs
    ADD CONSTRAINT weight_logs_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- PostgreSQL database dump complete
--

