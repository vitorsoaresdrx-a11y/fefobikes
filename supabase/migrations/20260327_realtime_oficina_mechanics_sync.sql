-- BI-DIRECTIONAL SYNC BETWEEN MECHANIC_JOBS AND SERVICE_ORDERS
-- This ensures that Oficina Kanban and Mechanics Panel are always in sync in real-time.

-- 1. ENABLE REALTIME ONLY FOR TABLES NOT YET IN PUBLICATION
-- Handle existing members gracefully
DO $$ 
BEGIN 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE os_adicionais;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'os_adicionais already in publication';
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE os_pagamentos;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'os_pagamentos already in publication';
  END;
END $$;

-- 2. FUNCTION: SYNC FROM MECHANIC_JOBS TO SERVICE_ORDERS
CREATE OR REPLACE FUNCTION sync_job_to_service_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Avoid infinite loops: only proceed if status or core data changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.problem IS NOT DISTINCT FROM NEW.problem) THEN
    RETURN NEW;
  END IF;

  INSERT INTO service_orders (
    id, customer_name, customer_cpf, customer_whatsapp, bike_name, problem, price, 
    mechanic_status, updated_at
  )
  VALUES (
    NEW.id, NEW.customer_name, NEW.customer_cpf, NEW.customer_whatsapp, NEW.bike_name, NEW.problem, NEW.price,
    CASE 
      WHEN NEW.status = 'in_repair' THEN 'pending'
      WHEN NEW.status = 'in_maintenance' THEN 'accepted'
      WHEN NEW.status IN ('in_analysis', 'ready', 'delivered') THEN 'done'
      ELSE 'cancelled'
    END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    customer_whatsapp = EXCLUDED.customer_whatsapp,
    bike_name = EXCLUDED.bike_name,
    problem = EXCLUDED.problem,
    price = EXCLUDED.price,
    mechanic_status = EXCLUDED.mechanic_status,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGER ON MECHANIC_JOBS
DROP TRIGGER IF EXISTS tr_sync_job_to_service_order ON mechanic_jobs;
CREATE TRIGGER tr_sync_job_to_service_order
AFTER INSERT OR UPDATE ON mechanic_jobs
FOR EACH ROW EXECUTE FUNCTION sync_job_to_service_order();


-- 4. FUNCTION: SYNC FROM SERVICE_ORDERS TO MECHANIC_JOBS
CREATE OR REPLACE FUNCTION sync_service_order_to_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Avoid infinite loops: only proceed if mechanic_status changed
  IF (TG_OP = 'UPDATE' AND OLD.mechanic_status IS NOT DISTINCT FROM NEW.mechanic_status) THEN
    RETURN NEW;
  END IF;

  -- Map service_orders back to mechanic_jobs
  UPDATE mechanic_jobs SET
    status = CASE 
      WHEN NEW.mechanic_status = 'pending' THEN 'in_repair'
      WHEN NEW.mechanic_status = 'accepted' THEN 'in_maintenance'
      WHEN NEW.mechanic_status = 'done' THEN 'in_analysis'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.id AND status NOT IN ('delivered', 'cancelado');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER ON SERVICE_ORDERS
DROP TRIGGER IF EXISTS tr_sync_service_order_to_job ON service_orders;
CREATE TRIGGER tr_sync_service_order_to_job
AFTER UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION sync_service_order_to_job();
