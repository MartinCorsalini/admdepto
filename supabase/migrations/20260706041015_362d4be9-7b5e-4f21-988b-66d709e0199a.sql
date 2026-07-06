
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "self insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- apartments
CREATE TABLE public.apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF5A5F',
  address TEXT,
  active_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartments TO authenticated;
GRANT ALL ON public.apartments TO service_role;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all apartments" ON public.apartments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'airbnb', -- airbnb, booking, youtube, direct, other
  guest_name TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS ((check_out - check_in)) STORED,
  currency TEXT NOT NULL DEFAULT 'ARS', -- ARS or USD
  amount_usd NUMERIC(12,2) DEFAULT 0,
  amount_ars NUMERIC(14,2) DEFAULT 0,
  exchange_rate NUMERIC(12,4) DEFAULT 0,
  cleaning_fee_ars NUMERIC(12,2) DEFAULT 0,
  booking_commission_usd NUMERIC(12,2) DEFAULT 0,
  booking_commission_ars NUMERIC(12,2) DEFAULT 0,
  admin_percentage NUMERIC(5,2) NOT NULL DEFAULT 20,
  supplies_cost_ars NUMERIC(12,2) DEFAULT 0,
  supplies_description TEXT,
  separated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, pending, cancelled
  source TEXT NOT NULL DEFAULT 'manual', -- manual, ical
  ical_uid TEXT,
  ical_source_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ical_source_id, ical_uid)
);
CREATE INDEX ON public.reservations(apartment_id, check_in);
CREATE INDEX ON public.reservations(check_in, check_out);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all reservations" ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ical_sources
CREATE TABLE public.ical_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'booking',
  label TEXT,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ical_sources TO authenticated;
GRANT ALL ON public.ical_sources TO service_role;
ALTER TABLE public.ical_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all ical" ON public.ical_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.reservations ADD CONSTRAINT reservations_ical_source_fk
  FOREIGN KEY (ical_source_id) REFERENCES public.ical_sources(id) ON DELETE SET NULL;

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to all
  type TEXT NOT NULL, -- reservation_new, reservation_updated, ical_synced, question, etc.
  title TEXT NOT NULL,
  message TEXT,
  related_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  related_apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_apartments_updated BEFORE UPDATE ON public.apartments FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE TRIGGER t_reservations_updated BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE TRIGGER t_ical_updated BEFORE UPDATE ON public.ical_sources FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- profile auto-create on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- notification on reservation insert
CREATE OR REPLACE FUNCTION public.tg_reservation_notify() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  apt_name TEXT;
BEGIN
  SELECT name INTO apt_name FROM public.apartments WHERE id = NEW.apartment_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_reservation_id, related_apartment_id)
    VALUES (
      NULL,
      CASE WHEN NEW.source = 'ical' THEN 'reservation_ical' ELSE 'reservation_new' END,
      'Nueva reserva en ' || COALESCE(apt_name, 'depto'),
      COALESCE(NEW.guest_name, 'Huésped') || ' · ' || to_char(NEW.check_in, 'DD/MM') || ' → ' || to_char(NEW.check_out, 'DD/MM') || ' · ' || NEW.platform,
      NEW.id,
      NEW.apartment_id
    );
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_reservation_notify AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.tg_reservation_notify();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- seed apartments
INSERT INTO public.apartments (name, color, notes) VALUES
  ('Bristol', '#FF5A5F', 'Departamento principal'),
  ('Lamadrid', '#00A699', 'Se habilita a partir de diciembre 2026');
