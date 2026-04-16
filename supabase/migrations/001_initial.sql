-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  passport_country TEXT NOT NULL CHECK (passport_country IN ('RU','UA','KZ')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visa entries
CREATE TABLE visa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  entry_date DATE NOT NULL,
  visa_type TEXT NOT NULL,
  max_days INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT entry_date_not_future CHECK (entry_date <= CURRENT_DATE)
);

-- Computed deadline view
CREATE VIEW visa_entries_with_deadline AS
SELECT
  *,
  entry_date + max_days AS deadline,
  (entry_date + max_days) - CURRENT_DATE AS days_left
FROM visa_entries;

-- Visa run schemes
CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  passport TEXT NOT NULL,
  from_country TEXT NOT NULL,
  to_country TEXT NOT NULL,
  border_crossing TEXT,
  cost_usd INTEGER,
  duration_hours INTEGER,
  description TEXT NOT NULL,
  tip TEXT,
  verified_at DATE NOT NULL DEFAULT CURRENT_DATE,
  works_count INTEGER DEFAULT 0,
  broken_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes (one per user per scheme)
CREATE TABLE scheme_votes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('works','broken')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, scheme_id)
);

-- Visa rules reference
CREATE TABLE visa_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport TEXT NOT NULL,
  country TEXT NOT NULL,
  visa_type TEXT NOT NULL,
  max_days INTEGER NOT NULL,
  cost_of_living_usd INTEGER,
  cities TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passport, country, visa_type)
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  context_screen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: visa rules
INSERT INTO visa_rules (passport, country, visa_type, max_days, cost_of_living_usd, cities, notes) VALUES
('RU','VN','evisa_90', 90, 700, 'HCMC · Hanoi · Da Nang', 'E-visa онлайн за $25'),
('RU','TH','visa_exempt_30', 30, 800, 'BKK · CNX · Phuket', 'Безвиз на 30 дней'),
('RU','TH','dtv_180', 180, 800, 'BKK · CNX', 'DTV виза, нужен $15k на счету'),
('RU','KH','visa_on_arrival_30', 30, 600, 'PP · SR', '$30 на границе'),
('RU','LA','visa_on_arrival_30', 30, 500, 'VTE · LP', '$20-35 на границе'),
('RU','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней'),
('RU','ID','visa_on_arrival_60', 60, 700, 'Bali · Jakarta', 'VOA + продление = 60 дней'),
('RU','PH','visa_exempt_30', 30, 650, 'Cebu · Manila', 'Можно продлить до 59 дней'),
('UA','VN','evisa_90', 90, 700, 'HCMC · Hanoi', 'E-visa онлайн'),
('UA','TH','visa_exempt_30', 30, 800, 'BKK · CNX', 'Безвиз 30 дней'),
('UA','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней'),
('KZ','VN','evisa_90', 90, 700, 'HCMC · Hanoi', 'E-visa онлайн'),
('KZ','TH','visa_exempt_30', 30, 800, 'BKK · CNX', 'Безвиз 30 дней'),
('KZ','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней');

-- Seed: starter schemes
INSERT INTO schemes (passport, from_country, to_country, border_crossing, cost_usd, duration_hours, description, tip, verified_at, works_count) VALUES
('RU','VN','LA','Nam Phao / Cau Treo', 25, 10,
 'Автобус из HCMC → Vinh → граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней. Весь день туда-обратно.',
 'Бери $35 налик — $20 виза Лаос + буфер на транспорт на месте',
 '2026-03-15', 47),
('RU','VN','KH','Moc Bai / Bavet', 40, 5,
 'Из HCMC автобус до Moc Bai — 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина, можно уложиться в полдня.',
 'Виза Камбоджа $30 на месте. Некоторые автобусы берут $5 доп — торгуйся',
 '2026-02-20', 31),
('RU','VN','KR', NULL, 200, 168,
 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь обратно с готовой Thai визой или сразу в Бангкок. Корея 90 дней безвиз для RU.',
 'Совмести с путешествием — минус стресс, плюс Thai виза готова',
 '2026-01-10', 19);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON users FOR ALL USING (
  telegram_id = (current_setting('app.telegram_id', true))::BIGINT
);
CREATE POLICY "entries_own" ON visa_entries FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
CREATE POLICY "schemes_read" ON schemes FOR SELECT USING (true);
CREATE POLICY "schemes_write" ON schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_own" ON scheme_votes FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
CREATE POLICY "chat_own" ON chat_messages FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
