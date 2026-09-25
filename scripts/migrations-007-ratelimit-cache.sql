-- Migration 007 — rate limit atômico + invalidação do cache de respostas
-- Apply after scripts/migrations-006-documents-storage-bucket.sql
--
-- 1) register_query_and_check_limit: substitui o count-then-insert de
--    lib/ratelimit/limiter.ts. O count seguido de insert permite que rajadas
--    simultâneas do mesmo IP passem do limite (todas leem o mesmo count antes
--    de qualquer insert). Aqui o insert acontece primeiro e a decisão usa o
--    total já incluindo a linha nova, dentro de uma única sentença atômica.
--    Fail-open: qualquer erro na RPC é tratado pelo chamador como "permitir".
-- 2) bump_corpus_version: chamada após ingestão de documentos ou CRUD de
--    enquadramentos; limpa TODO o cache de respostas. Um cartão pode citar
--    qualquer dispositivo, então não dá para invalidar seletivamente com
--    segurança — antes, respostas obsoletas ficavam até 30 dias no ar.
-- 3) purge_expired_cache: limpa as entradas cujo ttl_dias individual já
--    venceu, respeitando o TTL de cada linha (o sweeper antigo assumia 30
--    dias fixos para todas).

-- ---------------------------------------------------------------------------
-- 1) Rate limit atômico por IP/hora (reserva a vaga e decide de uma vez)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_query_and_check_limit(
  p_ip TEXT,
  p_limit INT,
  p_tipo_consulta TEXT DEFAULT 'situacao',
  p_pergunta TEXT DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT FALSE,
  p_modelo TEXT DEFAULT 'database',
  p_sucesso BOOLEAN DEFAULT TRUE,
  p_tempo_ms INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_usadas INT;
  v_janela TIMESTAMPTZ := now() - INTERVAL '1 hour';
BEGIN
  -- Insert first, atomically: the count below already includes this row.
  INSERT INTO uso_diario (
    ip_endereco, timestamp, tipo_consulta, pergunta,
    cache_hit, modelo_ia_usado, sucesso, tempo_ms
  ) VALUES (
    p_ip, now(), p_tipo_consulta, p_pergunta,
    p_cache_hit, p_modelo, p_sucesso, p_tempo_ms
  )
  RETURNING id INTO v_id;

  SELECT count(*) INTO v_usadas
  FROM uso_diario
  WHERE ip_endereco = p_ip
    AND timestamp >= v_janela;

  RETURN jsonb_build_object(
    'id', v_id,
    'usadas', v_usadas,
    'permitido', v_usadas <= p_limit,
    'restantes', GREATEST(p_limit - v_usadas, 0),
    'limite', p_limit
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Invalidação do cache de respostas quando a base muda
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bump_corpus_version()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removidos INT;
BEGIN
  DELETE FROM cache_respostas;
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  RETURN v_removidos;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Limpeza das entradas expiradas (respeita o ttl_dias de cada linha)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_expired_cache()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removidos INT;
BEGIN
  DELETE FROM cache_respostas
  WHERE data_ultimo_acesso < now() - (ttl_dias || ' days')::interval;
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  RETURN v_removidos;
END;
$$;
