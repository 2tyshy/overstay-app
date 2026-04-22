-- Replace the tiny starter seed from 001 with 20 curated real-world schemes.
-- Counters are zeroed so works_count / broken_count reflect actual community
-- votes, not made-up social proof. verified_at is set to a recent date per
-- route — it's when the underlying rules (VN 45d visa-free, TH Nov-2025
-- land-entry cap, TH-KH border closure) were last cross-checked.

-- ----- schemes cleanup + reseed -----
TRUNCATE schemes RESTART IDENTITY CASCADE;

INSERT INTO schemes (passport, from_country, to_country, border_crossing, cost_usd, duration_hours, description, tip, verified_at, works_count, broken_count) VALUES

-- ——— RU passport: VN-based ———
('RU', 'VN', 'KH', 'Moc Bai / Bavet', 35, 8,
 'Автобус 703 от автовокзала Park 23/9 (HCMC) до Moc Bai, VND 40 000 (~$1.6). Пешком через КПП, на той стороне — Камбоджа VOA $30-35. Возвращаешься обратно с новой VN e-visa (важно: порт въезда в заявке — "Moc Bai landport", иначе завернут).',
 'Стартуй до 9 утра: последний автобус обратно из Moc Bai около 16:00, весь круг займёт 3-5 часов.',
 '2026-03-18', 0, 0),

('RU', 'VN', 'LA', 'Cau Treo / Nam Phao', 55, 24,
 'Ночной автобус Hanoi → Vinh → граница Cau Treo. Лаос VOA $30-40 (для РФ — $30 по последним отчётам), разворот в тот же день. Менее затоптанный маршрут, чем Moc Bai, зато дольше.',
 'Только наличные USD на лаосской стороне — мелкими купюрами. У российских карт на месте ничего не получится оплатить.',
 '2026-02-10', 0, 0),

('RU', 'VN', 'KZ', NULL, 350, 96,
 'Полный ресет: рейс HCMC/Hanoi → Алматы или Астана, 3-4 дня, обратно с новой e-visa или по 45-дневному безвизу. Пригодится тем, кто зависает в VN дольше 135 дней (45 безвиз + 90 e-visa) и хочет чистый цикл.',
 'Удобно совместить с продлением российского загранпаспорта в консульстве — одной поездкой закрываешь и визу, и документы.',
 '2026-01-25', 0, 0),

('RU', 'VN', 'KH', 'Ha Tien / Prek Chak', 45, 6,
 'Южный вариант для тех, кто на Phu Quoc или в Меккодельте. Паром Phu Quoc → Ha Tien (~1.5 ч, $15), дальше мото-такси до КПП (10 мин, 50 000 VND). Камбоджа VOA $30-35, обратно сразу. Тихо, без автобусных толп Moc Bai.',
 'Паром с Phu Quoc ходит по расписанию до 14:30 — последний обратно в 16:00. Если не успел, застрянешь в Ha Tien на ночь.',
 '2026-02-28', 0, 0),

('RU', 'VN', 'LA', 'Lao Bao / Dansavanh', 50, 14,
 'Центральный Вьетнам: автобус Hue или Da Nang → Lao Bao (~5-6 ч, 300-400 000 VND). Переход пеший, Лаос VOA $30-42. На той стороне — Savannakhet. Удобно из центрального VN, короче, чем тащиться до Cau Treo или Moc Bai.',
 'В Lao Bao много «помощников» предлагают оформить визу за $80 — не ведись, всё делается самому в окошке за $30-40 + 2 фото.',
 '2026-03-08', 0, 0),

('RU', 'VN', 'TH', NULL, 160, 72,
 'Weekend в Бангкоке: VietJet/AirAsia HCMC/Hanoi → BKK от $50 round trip, 2-3 ночи в Таиланде, обратно в VN с новой e-visa или 45-безвизом. Хороший вариант для тех, кто хочет совместить с шопингом/прокачкой DTV (подача в Royal Thai E-Visa онлайн, забирать в BKK не обязательно).',
 'После Nov-2025 в TH лимит 2 наземных безвизовых в год — прилёт на самолёте НЕ считается в этот лимит. Так что в BKK можно летать сколько хочешь.',
 '2026-04-05', 0, 0),

('RU', 'VN', 'MY', NULL, 140, 60,
 'HCMC → Kuala Lumpur, AirAsia/Vietjet от $40-80 one-way. MY безвиз 30 дней для РФ. Ночь в KL Sentral ($15 хостел), обратно в VN. Дешевле чем BKK, цивильный аэропорт, хорошая точка для апгрейда на DTV (Royal Thai в KL работает).',
 'Рейсы из Hanoi дороже и реже — лучше через HCMC, оттуда AirAsia летает несколько раз в день.',
 '2026-03-22', 0, 0),

('RU', 'VN', 'VN', 'multi-entry e-visa', 50, 6,
 'Не ран, а лайфхак: при оформлении 90-дневной e-visa выбирай MULTIPLE ENTRY ($50 вместо $25 single). В пределах 90 дней можно свободно летать в Таиланд/Малайзию/Камбоджу и возвращаться без новой визы. Clock не ресетится — 90 дней общие от первого въезда, но мобильность сильно лучше.',
 'Порт въезда в заявке указывай тот, через который вернёшься обратно. Если летишь через HCMC — "Tan Son Nhat international airport". Ошибёшься — завернут.',
 '2026-04-02', 0, 0),

('RU', 'VN', 'PH', NULL, 220, 96,
 'HCMC → Manila или Cebu (Philippines AirAsia/Cebu Pacific ~$100-150 RT). PH безвиз 30 дней для РФ, 3-4 дня с пляжами и обратно в VN с новой e-visa. Малоизвестный маршрут — никаких очередей на границе, чистый рестарт.',
 'На въезде в PH спросят onward ticket — покажи обратный в VN. Без него не пустят, это жёсткое требование.',
 '2026-03-14', 0, 0),

-- ——— RU passport: TH-based ———
('RU', 'TH', 'LA', 'Nong Khai / Thanaleng (Friendship Bridge 1)', 90, 48,
 'Ночной поезд BKK → Nong Khai (~12 ч, 800-1200 THB). Шаттл через мост Дружбы, Лаос VOA $30-42. С Nov-2025 same-day разворот — красный флаг; переночуй 1-2 ночи во Вьентьяне. Подходит для DTV-holders и для ресета 60-дневного безвиза (но помни про лимит 2 наземных входа в год).',
 'Для DTV — лучше 2-3 ночи в Лаосе. Иммиграция на въезде смотрит на штампы: слишком частые краткие забеги без причины = отказ.',
 '2026-03-28', 0, 0),

('RU', 'TH', 'LA', 'Chong Mek / Vang Tao', 50, 10,
 'Автобус Ubon Ratchathani → Chong Mek (~1 ч). Переход пеший, с тайской стороны до лаосской 5 минут. На Vang Tao оформляют VOA $30 на 15 дней (e-visa тут не принимают). Удобно, если ты в южном/восточном Исане.',
 'e-visa Лаоса на этот переход НЕ работает — только бумажный VOA. Готовь две фото 3x4 и $30 одной купюрой.',
 '2026-02-22', 0, 0),

('RU', 'TH', 'MY', 'Padang Besar (поезд)', 25, 6,
 'Поезд Hat Yai → Padang Besar (~1 ч, 50 THB). Прямо на станции и тайский, и малайзийский иммиграционный контроль. MY безвиз 30 дней. Обратно — поездом или минивэном. Раньше был самым беспроблемным раном, но c Nov-2025 Таиланд ограничил до 2 наземных безвизовых въездов в год.',
 'После двух таких раундов за календарный год переходи на DTV или нормальную тур-визу — иначе на третий раз развернут на границе.',
 '2026-04-01', 0, 0),

('RU', 'TH', 'LA', NULL, 420, 120,
 'Полёт BKK → Vientiane (~$80), 3-5 дней во Вьентьяне, подача DTV через Royal Thai Embassy в Лаосе. DTV = 180 дней мультивход, виза на 5 лет. Нужно: выписка на 500 000 THB (~$14-16k), proof of remote work/Muay Thai/cooking и т.п. Консульский сбор 10 000 THB.',
 'В Lao-консульстве подача самая гибкая из всех Royal Thai Embassies — многие именно сюда ездят из Бангкока. Заранее бронируй запись на сайте e-visa.',
 '2026-03-10', 0, 0),

('RU', 'TH', 'KH', 'Aranyaprathet / Poipet', 50, 8,
 '⚠️ СЕЙЧАС НЕ РАБОТАЕТ: все наземные границы TH-KH закрыты с конца октября 2025 из-за приграничного конфликта. В обычное время — автобус BKK → Poipet, Cambodia e-visa $36 или VOA $30-35. Следи за новостями: обещают открыть, когда уляжется.',
 'До открытия — только через самолёт до Пномпеня ($60-100) или через Лаос. Не веди туда сейчас.',
 '2026-04-15', 0, 0),

-- ——— RU passport: ID-based ———
('RU', 'ID', 'MY', NULL, 180, 48,
 'Классика балийцев: рейс DPS → KUL ($80-150 туда-обратно), 1-2 ночи в Куала-Лумпуре. Назад — новый e-VOA Индонезии на 30 дней ($35). В KL — хостел $15-30, еда копейки. Самый дешёвый ресет когда 30+30 не хватает.',
 'С июня 2025 биометрию сдают лично в иммиграционном офисе — первый раз в году придётся один раз съездить. Оплачивать e-VOA российской картой нельзя; используй карту KZ/GE или сервис-агента.',
 '2026-03-30', 0, 0),

('RU', 'ID', 'SG', NULL, 260, 48,
 'Рейс DPS → SIN ($120-180 round trip). Сингапур дороже KL, зато виза не нужна (транзит до 96 ч). Удобно если параллельно нужна консульская задача: посольства РФ, нотариальные действия.',
 'Не хочешь платить за гостиницу в SG — бери рейс с пересадкой 20+ часов и используй транзитную зону с душевой в Changi.',
 '2026-02-28', 0, 0),

-- ——— UA passport ———
('UA', 'VN', 'KH', 'Moc Bai / Bavet', 40, 8,
 'Для UA паспорта схема идентична российской: автобус 703 до Moc Bai, Камбоджа VOA $30-35, обратно по новой 90-дневной e-visa. 45-дневного безвиза у украинцев нет, только e-visa.',
 'Украинцы часто получают e-visa быстрее через агентов — официальная оплата долларами, с украинской карты оплатить не всегда выходит.',
 '2026-03-05', 0, 0),

('UA', 'TH', 'MY', 'Padang Besar (поезд)', 25, 6,
 'Тот же Hat Yai → Padang Besar на поезде. MY безвиз 30 дней для UA паспорта работает штатно. Тайский лимит 2 наземных въезда в год с Nov-2025 действует на всех иностранцев, без исключений.',
 'Если уже выбрал лимит — лети через KUL или делай DTV из Куала-Лумпура (там тоже принимают заявки).',
 '2026-04-03', 0, 0),

-- ——— KZ passport ———
('KZ', 'VN', 'KH', 'Moc Bai / Bavet', 35, 8,
 'Казахи во Вьетнаме на тех же условиях, что и украинцы: только e-visa 90 дней, без безвиза. Классический Moc Bai → Bavet, назад с новой e-visa. Оплатить e-visa казахской картой обычно получается — это плюс KZ.',
 'Если летишь через Алматы — подавай e-visa из Алматы, там интернет быстрее и форму проще заполнить без VPN.',
 '2026-03-12', 0, 0),

('KZ', 'TH', 'LA', 'Nong Khai / Thanaleng', 90, 48,
 'Тот же BKK → Nong Khai маршрут. KZ безвиз в Таиланд — 30 дней (короче, чем у РФ). Ночной поезд + ночёвка в Vientiane, обратно на следующий день. Для Лаоса казахам нужен VOA $30.',
 'У казахов безвиз TH всего 30 дней (не 60), так что ритм раньше: планируй выезд на 28-29-й день, не тяни.',
 '2026-02-18', 0, 0);


-- ----- scheme_comments table (community thread on each scheme) -----
CREATE TABLE scheme_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheme_comments_scheme ON scheme_comments(scheme_id, created_at DESC);

ALTER TABLE scheme_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (they're public data like schemes themselves)
CREATE POLICY "scheme_comments_read" ON scheme_comments FOR SELECT USING (true);

-- Only the author can post / delete their own comment
CREATE POLICY "scheme_comments_insert" ON scheme_comments FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
CREATE POLICY "scheme_comments_delete" ON scheme_comments FOR DELETE USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);

-- Realtime publication — needed for supabase.channel() subscriptions.
ALTER PUBLICATION supabase_realtime ADD TABLE scheme_comments;


-- ----- tighten schemes RLS: author edits only -----
-- 001 had "schemes_write" allowing any INSERT. Replace with author-bound
-- policy + UPDATE/DELETE for the author only. Anonymous schemes
-- (author_id IS NULL — i.e. seed rows above) remain immutable.

DROP POLICY IF EXISTS "schemes_write" ON schemes;

CREATE POLICY "schemes_insert_authored" ON schemes FOR INSERT WITH CHECK (
  author_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);

CREATE POLICY "schemes_update_own" ON schemes FOR UPDATE USING (
  author_id IS NOT NULL
  AND author_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);

CREATE POLICY "schemes_delete_own" ON schemes FOR DELETE USING (
  author_id IS NOT NULL
  AND author_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);

-- Vote counter updates go through a SECURITY DEFINER RPC so we don't have
-- to grant blanket UPDATE on schemes. Atomic + safer than client-side math.
CREATE OR REPLACE FUNCTION apply_scheme_vote(p_scheme_id UUID, p_vote TEXT, p_prev TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- reverse previous vote if any
  IF p_prev = 'works' THEN
    UPDATE schemes SET works_count = GREATEST(0, works_count - 1) WHERE id = p_scheme_id;
  ELSIF p_prev = 'broken' THEN
    UPDATE schemes SET broken_count = GREATEST(0, broken_count - 1) WHERE id = p_scheme_id;
  END IF;
  -- apply new vote if any
  IF p_vote = 'works' THEN
    UPDATE schemes SET works_count = works_count + 1 WHERE id = p_scheme_id;
  ELSIF p_vote = 'broken' THEN
    UPDATE schemes SET broken_count = broken_count + 1 WHERE id = p_scheme_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_scheme_vote(UUID, TEXT, TEXT) TO anon, authenticated;
