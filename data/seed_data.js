function loadSeedData() {

  // ── Teams ──────────────────────────────────────────────────────
  const teams = [
    {id:'t_ind',name:'India',        country:'India',       flag:'🇮🇳'},
    {id:'t_aus',name:'Australia',    country:'Australia',   flag:'🇦🇺'},
    {id:'t_eng',name:'England',      country:'England',     flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
    {id:'t_pak',name:'Pakistan',     country:'Pakistan',    flag:'🇵🇰'},
    {id:'t_sa', name:'South Africa', country:'S. Africa',   flag:'🇿🇦'},
    {id:'t_nz', name:'New Zealand',  country:'New Zealand', flag:'🇳🇿'},
    {id:'t_wi', name:'West Indies',  country:'W. Indies',   flag:'🏏'},
    {id:'t_sl', name:'Sri Lanka',    country:'Sri Lanka',   flag:'🇱🇰'},
    {id:'t_ban',name:'Bangladesh',   country:'Bangladesh',  flag:'🇧🇩'},
    {id:'t_afg',name:'Afghanistan',  country:'Afghanistan', flag:'🇦🇫'},
    {id:'t_zim',name:'Zimbabwe',     country:'Zimbabwe',    flag:'🇿🇼'},
    {id:'t_ire',name:'Ireland',      country:'Ireland',     flag:'🇮🇪'},
    {id:'t_sco',name:'Scotland',     country:'Scotland',    flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
    {id:'t_ned',name:'Netherlands',  country:'Netherlands', flag:'🇳🇱'},
    {id:'t_uae',name:'UAE',          country:'UAE',         flag:'🇦🇪'},
    {id:'t_nep',name:'Nepal',        country:'Nepal',       flag:'🇳🇵'},
    {id:'t_usa',name:'USA',          country:'USA',         flag:'🇺🇸'},
    {id:'t_can',name:'Canada',       country:'Canada',      flag:'🇨🇦'},
    {id:'t_png',name:'Papua NG',     country:'PNG',         flag:'🇵🇬'},
    {id:'t_nam',name:'Namibia',      country:'Namibia',     flag:'🇳🇦'},
  ];

  teams.forEach(t => dbRun(
    `INSERT OR IGNORE INTO Teams(id,name,country,type,division,gt_tier,balance,fanbase,reputation,flag)
VALUES(?,?,?,'international',0,0,5000000,500000,60,?)`,
    [t.id, t.name, t.country, t.flag]
  ));

  // ── Venues ─────────────────────────────────────────────────────
  const venues = [
    {id:'v1', name:'Wankhede Stadium',      country:'India',       capacity:33000,  pitch:'Flat',          cond:'Good'},
    {id:'v2', name:'Eden Gardens',          country:'India',       capacity:66000,  pitch:'Good',          cond:'Good'},
    {id:'v3', name:'Arun Jaitley Stadium',  country:'India',       capacity:40000,  pitch:'Flat',          cond:'Good'},
    {id:'v4', name:'MCG',                   country:'Australia',   capacity:100000, pitch:'Good',          cond:'Good'},
    {id:'v5', name:'SCG',                   country:'Australia',   capacity:48000,  pitch:'Deteriorating', cond:'Worn'},
    {id:'v6', name:'Adelaide Oval',         country:'Australia',   capacity:53000,  pitch:'Good',          cond:'Good'},
    {id:'v7', name:'Lords',                 country:'England',     capacity:30000,  pitch:'Deteriorating', cond:'Worn'},
    {id:'v8', name:'The Oval',              country:'England',     capacity:25000,  pitch:'Good',          cond:'Good'},
    {id:'v9', name:'Edgbaston',             country:'England',     capacity:25000,  pitch:'Good',          cond:'Good'},
    {id:'v10',name:'Gaddafi Stadium',       country:'Pakistan',    capacity:27000,  pitch:'Rank Turner',   cond:'Dry'},
    {id:'v11',name:'National Stadium Khi',  country:'Pakistan',    capacity:34000,  pitch:'Flat',          cond:'Good'},
    {id:'v12',name:'Newlands',              country:'S. Africa',   capacity:25000,  pitch:'Good',          cond:'Good'},
    {id:'v13',name:'Wanderers',             country:'S. Africa',   capacity:34000,  pitch:'Good',          cond:'Good'},
    {id:'v14',name:'Eden Park',             country:'New Zealand', capacity:50000,  pitch:'Good',          cond:'Good'},
    {id:'v15',name:'Basin Reserve',         country:'New Zealand', capacity:12000,  pitch:'Deteriorating', cond:'Worn'},
    {id:'v16',name:'Kensington Oval',       country:'W. Indies',   capacity:28000,  pitch:'Flat',          cond:'Good'},
    {id:'v17',name:'Sabina Park',           country:'W. Indies',   capacity:20000,  pitch:'Good',          cond:'Good'},
    {id:'v18',name:'Pallekele',             country:'Sri Lanka',   capacity:35000,  pitch:'Rank Turner',   cond:'Dry'},
    {id:'v19',name:'R Premadasa Stadium',   country:'Sri Lanka',   capacity:35000,  pitch:'Flat',          cond:'Good'},
    {id:'v20',name:'Mirpur',                country:'Bangladesh',  capacity:26000,  pitch:'Rank Turner',   cond:'Dry'},
    {id:'v21',name:'Chittagong',            country:'Bangladesh',  capacity:20000,  pitch:'Good',          cond:'Good'},
    {id:'v22',name:'Sharjah',               country:'UAE',         capacity:16000,  pitch:'Flat',          cond:'Good'},
    {id:'v23',name:'Dubai Intl Stadium',    country:'UAE',         capacity:25000,  pitch:'Flat',          cond:'Good'},
    {id:'v24',name:'Harare Sports Club',    country:'Zimbabwe',    capacity:10000,  pitch:'Deteriorating', cond:'Worn'},
    {id:'v25',name:'Bulawayo AC',           country:'Zimbabwe',    capacity:8000,   pitch:'Good',          cond:'Good'},
    {id:'v26',name:'Kabul Intl Cricket',    country:'Afghanistan', capacity:15000,  pitch:'Flat',          cond:'Good'},
    {id:'v27',name:'Civil Service Ground',  country:'Ireland',     capacity:6000,   pitch:'Good',          cond:'Good'},
    {id:'v28',name:'The Grange',            country:'Scotland',    capacity:3500,   pitch:'Deteriorating', cond:'Worn'},
    {id:'v29',name:'VRA Ground',            country:'Netherlands', capacity:5000,   pitch:'Good',          cond:'Good'},
    {id:'v30',name:'TU Ground',             country:'Nepal',       capacity:20000,  pitch:'Rank Turner',   cond:'Dry'},
  ];

  // ✅ Now inserts pitch_condition too
  venues.forEach(v => dbRun(
    `INSERT OR IGNORE INTO Venues(id,name,country,capacity,pitch_type,pitch_condition) VALUES(?,?,?,?,?,?)`,
    [v.id, v.name, v.country, v.capacity, v.pitch, v.cond]
  ));

  // ── Field Presets ──────────────────────────────────────────────
  const presets = [
    {id:'fp1', name:'Aggressive Spin Field', p_dot_mod:-0.05, boundary_mod: 0.05},
    {id:'fp2', name:'Pace-Heavy Field',      p_dot_mod: 0.05, boundary_mod:-0.05},
    {id:'fp3', name:'Swing-Friendly Field',  p_dot_mod: 0.03, boundary_mod:-0.03},
    {id:'fp4', name:'Tight Spin Field',      p_dot_mod:-0.08, boundary_mod: 0.03},
    {id:'fp5', name:'Pace Attack Field',     p_dot_mod: 0.08, boundary_mod:-0.06},
  ];
  presets.forEach(fp => dbRun(
    `INSERT OR IGNORE INTO FieldPresets(id,team_id,name,p_dot_mod,boundary_mod) VALUES(?,NULL,?,?,?)`,
    [fp.id, fp.name, fp.p_dot_mod, fp.boundary_mod]
  ));

  // ── Players ────────────────────────────────────────────────────
  // role: BAT / BOWL / ALL / WK
  // Optional overrides per player:
  //   bh=bat_hand, bt=bowl_type, bwh=bowl_hand, bp=bowl_phase, sub=subtype
  //   cl=captain_leadership, ct=captain_tactics, ci=captain_influence, cm=captain_mode
  const players = [
    // ── INDIA (t_ind) ──
    {id:'p_ind_01',tid:'t_ind',name:'Rohit S',        age:36,role:'BAT', bat:92,bowl:20,field:75,wk:0, ps:90, cl:88,ct:82,ci:90,cm:'Inspirational'},
    {id:'p_ind_02',tid:'t_ind',name:'Virat K',        age:35,role:'BAT', bat:94,bowl:15,field:80,wk:0, ps:92, cl:92,ct:85,ci:95,cm:'Aggressive'},
    {id:'p_ind_03',tid:'t_ind',name:'Shubman G',      age:24,role:'BAT', bat:85,bowl:10,field:82,wk:0, ps:83, cl:55,ct:50,ci:58,cm:'Defensive'},
    {id:'p_ind_04',tid:'t_ind',name:'KL R',           age:32,role:'WK',  bat:82,bowl:0, field:78,wk:85,ps:80, cl:70,ct:68,ci:72,cm:'Experienced'},
    {id:'p_ind_05',tid:'t_ind',name:'Rishabh P',      age:26,role:'WK',  bat:84,bowl:0, field:75,wk:88,ps:83, cl:72,ct:65,ci:78,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_ind_06',tid:'t_ind',name:'Hardik P',       age:30,role:'ALL', bat:78,bowl:74,field:80,wk:0, ps:80, cl:78,ct:80,ci:82,cm:'Aggressive',  bt:'Medium Fast'},
    {id:'p_ind_07',tid:'t_ind',name:'Ravindra J',     age:32,role:'ALL', bat:72,bowl:78,field:76,wk:0, ps:76, cl:68,ct:74,ci:70,cm:'Tactical',    bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm'},
    {id:'p_ind_08',tid:'t_ind',name:'Ravichandran A', age:37,role:'ALL', bat:55,bowl:88,field:68,wk:0, ps:82, cl:80,ct:86,ci:78,cm:'Tactical',    bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_ind_09',tid:'t_ind',name:'Jasprit B',      age:30,role:'BOWL',bat:20,bowl:94,field:65,wk:0, ps:90, cl:70,ct:75,ci:68,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_ind_10',tid:'t_ind',name:'Mohammed S',     age:33,role:'BOWL',bat:18,bowl:88,field:62,wk:0, ps:84, cl:60,ct:65,ci:58,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ind_11',tid:'t_ind',name:'Yuzvendra C',    age:33,role:'BOWL',bat:22,bowl:86,field:68,wk:0, ps:82, cl:58,ct:70,ci:60,cm:'Tactical',    bt:'Leg Spin',sub:'Spin'},
    {id:'p_ind_12',tid:'t_ind',name:'Axar P',         age:30,role:'ALL', bat:68,bowl:76,field:72,wk:0, ps:74, cl:62,ct:68,ci:64,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin Allrounder'},
    {id:'p_ind_13',tid:'t_ind',name:'Ishan K',        age:25,role:'WK',  bat:78,bowl:0, field:72,wk:82,ps:76, cl:50,ct:48,ci:55,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_ind_14',tid:'t_ind',name:'Shreyas I',      age:29,role:'BAT', bat:83,bowl:10,field:76,wk:0, ps:80, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_ind_15',tid:'t_ind',name:'Suryakumar Y',   age:33,role:'BAT', bat:88,bowl:5, field:78,wk:0, ps:85, cl:75,ct:70,ci:80,cm:'Aggressive'},
    {id:'p_ind_16',tid:'t_ind',name:'Arshdeep S',     age:25,role:'BOWL',bat:15,bowl:82,field:65,wk:0, ps:78, cl:48,ct:55,ci:45,cm:'Defensive',   bh:'Left Hand',bt:'Medium Fast',bwh:'Left Arm',sub:'Pace'},

    // ── AUSTRALIA (t_aus) ──
    {id:'p_aus_01',tid:'t_aus',name:'David W',    age:37,role:'BAT', bat:90,bowl:20,field:78,wk:0, ps:88, cl:85,ct:80,ci:88,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_aus_02',tid:'t_aus',name:'Travis H',   age:31,role:'BAT', bat:87,bowl:15,field:80,wk:0, ps:84, cl:72,ct:68,ci:74,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_aus_03',tid:'t_aus',name:'Steve S',    age:34,role:'BAT', bat:93,bowl:35,field:76,wk:0, ps:90, cl:88,ct:86,ci:84,cm:'Experienced'},
    {id:'p_aus_04',tid:'t_aus',name:'Marnus L',   age:31,role:'BAT', bat:88,bowl:10,field:78,wk:0, ps:85, cl:68,ct:65,ci:70,cm:'Defensive'},
    {id:'p_aus_05',tid:'t_aus',name:'Alex C',     age:34,role:'WK',  bat:80,bowl:0, field:76,wk:86,ps:80, cl:72,ct:70,ci:74,cm:'Experienced'},
    {id:'p_aus_06',tid:'t_aus',name:'Glenn M',    age:32,role:'ALL', bat:80,bowl:76,field:82,wk:0, ps:82, cl:82,ct:85,ci:80,cm:'Tactical',    bt:'Medium Fast'},
    {id:'p_aus_07',tid:'t_aus',name:'Cameron G',  age:29,role:'ALL', bat:74,bowl:72,field:78,wk:0, ps:76, cl:65,ct:68,ci:62,cm:'Tactical',    bt:'Medium Fast'},
    {id:'p_aus_08',tid:'t_aus',name:'Pat C',      age:30,role:'BOWL',bat:22,bowl:93,field:65,wk:0, ps:90, cl:75,ct:80,ci:72,cm:'Tactical',    bt:'Fast',sub:'Pace'},
    {id:'p_aus_09',tid:'t_aus',name:'Mitchell S', age:32,role:'BOWL',bat:20,bowl:90,field:62,wk:0, ps:86, cl:65,ct:70,ci:60,cm:'Aggressive',  bh:'Left Hand',bt:'Fast',bwh:'Left Arm',sub:'Pace'},
    {id:'p_aus_10',tid:'t_aus',name:'Josh H',     age:30,role:'BOWL',bat:18,bowl:88,field:60,wk:0, ps:84, cl:58,ct:65,ci:55,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_aus_11',tid:'t_aus',name:'Adam Z',     age:35,role:'BOWL',bat:25,bowl:85,field:68,wk:0, ps:80, cl:72,ct:78,ci:68,cm:'Experienced', bt:'Leg Spin',sub:'Spin'},
    {id:'p_aus_12',tid:'t_aus',name:'Mitchell M', age:28,role:'BOWL',bat:20,bowl:84,field:64,wk:0, ps:78, cl:52,ct:58,ci:50,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_aus_13',tid:'t_aus',name:'Marcus S',   age:28,role:'BAT', bat:84,bowl:8, field:80,wk:0, ps:80, cl:60,ct:58,ci:62,cm:'Defensive'},
    {id:'p_aus_14',tid:'t_aus',name:'Usman K',    age:37,role:'BAT', bat:86,bowl:5, field:74,wk:0, ps:82, cl:70,ct:65,ci:72,cm:'Experienced'},
    {id:'p_aus_15',tid:'t_aus',name:'Sean A',     age:31,role:'ALL', bat:70,bowl:74,field:76,wk:0, ps:74, cl:60,ct:64,ci:58,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_aus_16',tid:'t_aus',name:'Josh I',     age:26,role:'BOWL',bat:14,bowl:80,field:60,wk:0, ps:74, cl:45,ct:50,ci:42,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},

    // ── ENGLAND (t_eng) ──
    {id:'p_eng_01',tid:'t_eng',name:'Zak C',      age:28,role:'BOWL',bat:22,bowl:88,field:68,wk:0, ps:84, cl:62,ct:68,ci:58,cm:'Defensive',       bt:'Fast Medium',sub:'Pace'},
    {id:'p_eng_02',tid:'t_eng',name:'Ben S',      age:33,role:'ALL', bat:84,bowl:80,field:78,wk:0, ps:86, cl:90,ct:88,ci:92,cm:'Aggressive',      bt:'Fast Medium',sub:'Pace Allrounder'},
    {id:'p_eng_03',tid:'t_eng',name:'Joe R',      age:33,role:'BAT', bat:91,bowl:30,field:80,wk:0, ps:88, cl:88,ct:84,ci:86,cm:'Experienced'},
    {id:'p_eng_04',tid:'t_eng',name:'Jonny B',    age:34,role:'WK',  bat:84,bowl:0, field:76,wk:86,ps:82, cl:72,ct:70,ci:74,cm:'Experienced'},
    {id:'p_eng_05',tid:'t_eng',name:'Harry B',    age:30,role:'BAT', bat:83,bowl:10,field:78,wk:0, ps:80, cl:62,ct:60,ci:64,cm:'Defensive'},
    {id:'p_eng_06',tid:'t_eng',name:'Jos B',      age:33,role:'WK',  bat:86,bowl:0, field:74,wk:88,ps:84, cl:82,ct:78,ci:85,cm:'Aggressive'},
    {id:'p_eng_07',tid:'t_eng',name:'Moeen A',    age:36,role:'ALL', bat:72,bowl:76,field:72,wk:0, ps:74, cl:70,ct:72,ci:75,cm:'Inspirational',  bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_eng_08',tid:'t_eng',name:'Liam L',     age:30,role:'BOWL',bat:28,bowl:84,field:66,wk:0, ps:78, cl:55,ct:62,ci:52,cm:'Defensive',       bt:'Fast Medium',sub:'Pace'},
    {id:'p_eng_09',tid:'t_eng',name:'Mark W',     age:37,role:'BOWL',bat:22,bowl:86,field:64,wk:0, ps:80, cl:68,ct:74,ci:65,cm:'Experienced',     bt:'Fast Medium',sub:'Pace'},
    {id:'p_eng_10',tid:'t_eng',name:'Stuart B',   age:43,role:'BOWL',bat:30,bowl:84,field:62,wk:0, ps:78, cl:75,ct:72,ci:70,cm:'Experienced',     bt:'Fast Medium',sub:'Pace'},
    {id:'p_eng_11',tid:'t_eng',name:'James A',    age:41,role:'BOWL',bat:20,bowl:88,field:60,wk:0, ps:82, cl:78,ct:80,ci:74,cm:'Tactical',         bt:'Fast',sub:'Pace'},
    {id:'p_eng_12',tid:'t_eng',name:'Phil S',     age:33,role:'BAT', bat:85,bowl:5, field:80,wk:0, ps:82, cl:65,ct:62,ci:68,cm:'Experienced',     bh:'Left Hand'},
    {id:'p_eng_13',tid:'t_eng',name:'Dawid M',    age:31,role:'BAT', bat:82,bowl:5, field:78,wk:0, ps:78, cl:58,ct:55,ci:60,cm:'Defensive',       bh:'Left Hand'},
    {id:'p_eng_14',tid:'t_eng',name:'Chris W',    age:29,role:'ALL', bat:70,bowl:72,field:74,wk:0, ps:72, cl:55,ct:58,ci:52,cm:'Impulsive',        bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_eng_15',tid:'t_eng',name:'Olly S',     age:26,role:'BOWL',bat:18,bowl:82,field:64,wk:0, ps:76, cl:48,ct:55,ci:45,cm:'Defensive',       bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin'},
    {id:'p_eng_16',tid:'t_eng',name:'Rehan A',    age:21,role:'ALL', bat:60,bowl:78,field:70,wk:0, ps:70, cl:40,ct:48,ci:42,cm:'Impulsive',        bt:'Leg Spin',sub:'Spin Allrounder'},

    // ── PAKISTAN (t_pak) ──
    {id:'p_pak_01',tid:'t_pak',name:'Babar A',      age:29,role:'BAT', bat:93,bowl:5, field:80,wk:0, ps:90, cl:88,ct:82,ci:90,cm:'Experienced'},
    {id:'p_pak_02',tid:'t_pak',name:'Mohammad R',   age:26,role:'BAT', bat:86,bowl:10,field:78,wk:0, ps:83, cl:65,ct:60,ci:68,cm:'Aggressive'},
    {id:'p_pak_03',tid:'t_pak',name:'Fakhar Z',     age:33,role:'BAT', bat:84,bowl:5, field:74,wk:0, ps:80, cl:62,ct:58,ci:65,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_pak_04',tid:'t_pak',name:'Mohammad H',   age:26,role:'WK',  bat:80,bowl:0, field:74,wk:85,ps:78, cl:60,ct:58,ci:62,cm:'Experienced'},
    {id:'p_pak_05',tid:'t_pak',name:'Shadab K',     age:25,role:'ALL', bat:68,bowl:80,field:76,wk:0, ps:76, cl:70,ct:76,ci:68,cm:'Tactical',    bt:'Leg Spin',sub:'Spin Allrounder'},
    {id:'p_pak_06',tid:'t_pak',name:'Imad W',       age:35,role:'ALL', bat:66,bowl:76,field:70,wk:0, ps:72, cl:65,ct:68,ci:62,cm:'Experienced', bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin Allrounder'},
    {id:'p_pak_07',tid:'t_pak',name:'Shaheen A',    age:24,role:'BOWL',bat:16,bowl:92,field:64,wk:0, ps:88, cl:72,ct:78,ci:68,cm:'Aggressive',  bh:'Left Hand',bt:'Fast',bwh:'Left Arm',sub:'Pace'},
    {id:'p_pak_08',tid:'t_pak',name:'Naseem S',     age:21,role:'BOWL',bat:14,bowl:88,field:62,wk:0, ps:83, cl:55,ct:60,ci:50,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_pak_09',tid:'t_pak',name:'Haris R',      age:29,role:'BOWL',bat:18,bowl:84,field:62,wk:0, ps:78, cl:52,ct:58,ci:48,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_pak_10',tid:'t_pak',name:'Abrar A',      age:25,role:'BOWL',bat:16,bowl:82,field:62,wk:0, ps:76, cl:48,ct:55,ci:45,cm:'Tactical',    bt:'Off Spin',sub:'Spin'},
    {id:'p_pak_11',tid:'t_pak',name:'Iftikhar A',   age:33,role:'ALL', bat:74,bowl:68,field:70,wk:0, ps:72, cl:58,ct:60,ci:55,cm:'Impulsive',   bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_pak_12',tid:'t_pak',name:'Azam K',       age:28,role:'BAT', bat:82,bowl:5, field:76,wk:0, ps:78, cl:60,ct:56,ci:62,cm:'Defensive'},
    {id:'p_pak_13',tid:'t_pak',name:'Usman M',      age:29,role:'BAT', bat:80,bowl:5, field:74,wk:0, ps:76, cl:55,ct:52,ci:58,cm:'Defensive'},
    {id:'p_pak_14',tid:'t_pak',name:'Sarfaraz A',   age:36,role:'WK',  bat:74,bowl:0, field:72,wk:82,ps:72, cl:68,ct:65,ci:70,cm:'Experienced'},
    {id:'p_pak_15',tid:'t_pak',name:'Zaman K',      age:27,role:'BAT', bat:84,bowl:5, field:76,wk:0, ps:80, cl:62,ct:58,ci:65,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_pak_16',tid:'t_pak',name:'Mohammad W',   age:29,role:'BOWL',bat:14,bowl:84,field:60,wk:0, ps:78, cl:50,ct:56,ci:46,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},

    // ── SOUTH AFRICA (t_sa) ──
    {id:'p_sa_01',tid:'t_sa',name:'Quinton D',  age:31,role:'WK',  bat:88,bowl:0, field:78,wk:90,ps:87, cl:85,ct:82,ci:88,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_sa_02',tid:'t_sa',name:'Temba B',    age:34,role:'BAT', bat:86,bowl:5, field:78,wk:0, ps:83, cl:82,ct:80,ci:84,cm:'Inspirational'},
    {id:'p_sa_03',tid:'t_sa',name:'Aiden M',    age:33,role:'BAT', bat:84,bowl:10,field:80,wk:0, ps:81, cl:70,ct:68,ci:72,cm:'Experienced', bh:'Left Hand'},
    {id:'p_sa_04',tid:'t_sa',name:'Rassie V',   age:34,role:'BAT', bat:85,bowl:10,field:80,wk:0, ps:82, cl:75,ct:72,ci:78,cm:'Inspirational'},
    {id:'p_sa_05',tid:'t_sa',name:'David M',    age:27,role:'BAT', bat:82,bowl:5, field:78,wk:0, ps:79, cl:58,ct:55,ci:60,cm:'Defensive'},
    {id:'p_sa_06',tid:'t_sa',name:'Marco J',    age:25,role:'ALL', bat:72,bowl:80,field:76,wk:0, ps:78, cl:62,ct:68,ci:60,cm:'Tactical',    bt:'Medium Fast',sub:'Pace Allrounder'},
    {id:'p_sa_07',tid:'t_sa',name:'Keshav M',   age:33,role:'BOWL',bat:24,bowl:84,field:68,wk:0, ps:78, cl:68,ct:74,ci:64,cm:'Tactical',    bt:'Leg Spin',sub:'Spin'},
    {id:'p_sa_08',tid:'t_sa',name:'Kagiso R',   age:31,role:'BOWL',bat:22,bowl:93,field:66,wk:0, ps:90, cl:78,ct:82,ci:74,cm:'Aggressive',  bt:'Fast',sub:'Pace'},
    {id:'p_sa_09',tid:'t_sa',name:'Anrich N',   age:30,role:'BOWL',bat:18,bowl:90,field:62,wk:0, ps:86, cl:65,ct:70,ci:60,cm:'Aggressive',  bt:'Fast',sub:'Pace'},
    {id:'p_sa_10',tid:'t_sa',name:'Lungi N',    age:30,role:'BOWL',bat:16,bowl:87,field:60,wk:0, ps:82, cl:58,ct:64,ci:55,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_sa_11',tid:'t_sa',name:'Wayne P',    age:38,role:'ALL', bat:70,bowl:74,field:72,wk:0, ps:72, cl:65,ct:68,ci:62,cm:'Experienced', bt:'Medium Fast',sub:'Pace Allrounder'},
    {id:'p_sa_12',tid:'t_sa',name:'Tristan S',  age:31,role:'ALL', bat:68,bowl:76,field:74,wk:0, ps:74, cl:60,ct:65,ci:58,cm:'Tactical',    bt:'Medium Fast',sub:'Pace Allrounder'},
    {id:'p_sa_13',tid:'t_sa',name:'Heinrich K', age:32,role:'BAT', bat:83,bowl:5, field:78,wk:0, ps:80, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_sa_14',tid:'t_sa',name:'Ryan R',     age:36,role:'BOWL',bat:20,bowl:82,field:62,wk:0, ps:76, cl:60,ct:66,ci:56,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_sa_15',tid:'t_sa',name:'Tabraiz S',  age:34,role:'BOWL',bat:20,bowl:84,field:64,wk:0, ps:78, cl:65,ct:70,ci:60,cm:'Tactical',    bt:'Left Arm Unorthodox',bwh:'Left Arm',sub:'Spin'},
    {id:'p_sa_16',tid:'t_sa',name:'Reeza H',    age:33,role:'BAT', bat:80,bowl:5, field:74,wk:0, ps:76, cl:55,ct:52,ci:58,cm:'Defensive'},

    // ── NEW ZEALAND (t_nz) ──
    {id:'p_nz_01',tid:'t_nz',name:'Kane W',     age:34,role:'BAT', bat:92,bowl:15,field:80,wk:0, ps:89, cl:92,ct:90,ci:88,cm:'Experienced', bh:'Left Hand'},
    {id:'p_nz_02',tid:'t_nz',name:'Devon C',    age:34,role:'BAT', bat:86,bowl:5, field:76,wk:0, ps:82, cl:68,ct:65,ci:70,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_nz_03',tid:'t_nz',name:'Tom L',      age:29,role:'WK',  bat:82,bowl:0, field:76,wk:86,ps:80, cl:65,ct:62,ci:68,cm:'Experienced', bh:'Left Hand'},
    {id:'p_nz_04',tid:'t_nz',name:'Daryl M',    age:32,role:'ALL', bat:78,bowl:74,field:80,wk:0, ps:78, cl:70,ct:72,ci:68,cm:'Tactical',    bt:'Medium Fast'},
    {id:'p_nz_05',tid:'t_nz',name:'Glenn P',    age:34,role:'ALL', bat:74,bowl:76,field:78,wk:0, ps:76, cl:68,ct:72,ci:65,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_nz_06',tid:'t_nz',name:'James N',    age:29,role:'BOWL',bat:20,bowl:88,field:64,wk:0, ps:83, cl:62,ct:68,ci:58,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_nz_07',tid:'t_nz',name:'Trent B',    age:34,role:'BOWL',bat:28,bowl:90,field:66,wk:0, ps:87, cl:70,ct:76,ci:66,cm:'Tactical',    bh:'Left Hand',bt:'Fast',bwh:'Left Arm',sub:'Pace'},
    {id:'p_nz_08',tid:'t_nz',name:'Matt H',     age:33,role:'BOWL',bat:22,bowl:86,field:64,wk:0, ps:81, cl:62,ct:68,ci:58,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nz_09',tid:'t_nz',name:'Tim S',      age:33,role:'BAT', bat:84,bowl:5, field:78,wk:0, ps:80, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_nz_10',tid:'t_nz',name:'Will Y',     age:32,role:'BAT', bat:80,bowl:5, field:76,wk:0, ps:76, cl:58,ct:55,ci:60,cm:'Defensive',   bh:'Left Hand'},
    {id:'p_nz_11',tid:'t_nz',name:'Mitchell S', age:27,role:'ALL', bat:72,bowl:72,field:74,wk:0, ps:72, cl:55,ct:58,ci:52,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_nz_12',tid:'t_nz',name:'Ish S',      age:32,role:'BOWL',bat:22,bowl:82,field:64,wk:0, ps:76, cl:58,ct:64,ci:55,cm:'Tactical',    bt:'Off Spin',sub:'Spin'},
    {id:'p_nz_13',tid:'t_nz',name:'Tom B',      age:28,role:'BOWL',bat:18,bowl:80,field:62,wk:0, ps:74, cl:48,ct:54,ci:45,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_nz_14',tid:'t_nz',name:'Mark C',     age:27,role:'BAT', bat:78,bowl:5, field:74,wk:0, ps:74, cl:50,ct:48,ci:52,cm:'Defensive'},
    {id:'p_nz_15',tid:'t_nz',name:'Finn A',     age:27,role:'BOWL',bat:20,bowl:82,field:64,wk:0, ps:76, cl:50,ct:56,ci:48,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_nz_16',tid:'t_nz',name:'Michael B',  age:32,role:'WK',  bat:74,bowl:0, field:72,wk:80,ps:72, cl:58,ct:55,ci:60,cm:'Experienced'},

    // ── WEST INDIES (t_wi) ──
    {id:'p_wi_01',tid:'t_wi',name:'Shai H',     age:29,role:'WK',  bat:84,bowl:0, field:76,wk:86,ps:82, cl:75,ct:70,ci:78,cm:'Aggressive'},
    {id:'p_wi_02',tid:'t_wi',name:'Brandon K',  age:26,role:'BAT', bat:82,bowl:5, field:78,wk:0, ps:79, cl:60,ct:56,ci:62,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_wi_03',tid:'t_wi',name:'Nicholas P', age:29,role:'BAT', bat:84,bowl:10,field:76,wk:0, ps:81, cl:70,ct:68,ci:72,cm:'Inspirational'},
    {id:'p_wi_04',tid:'t_wi',name:'Shimron H',  age:27,role:'ALL', bat:78,bowl:68,field:78,wk:0, ps:76, cl:65,ct:62,ci:68,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_wi_05',tid:'t_wi',name:'Rovman P',   age:30,role:'ALL', bat:74,bowl:70,field:76,wk:0, ps:74, cl:68,ct:65,ci:70,cm:'Inspirational',bt:'Medium Fast'},
    {id:'p_wi_06',tid:'t_wi',name:'Andre R',    age:36,role:'ALL', bat:76,bowl:72,field:74,wk:0, ps:74, cl:72,ct:70,ci:75,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_wi_07',tid:'t_wi',name:'Jason H',    age:36,role:'ALL', bat:76,bowl:74,field:74,wk:0, ps:76, cl:75,ct:72,ci:78,cm:'Aggressive',  bt:'Medium Fast'},
    {id:'p_wi_08',tid:'t_wi',name:'Alzarri J',  age:27,role:'BOWL',bat:18,bowl:86,field:64,wk:0, ps:81, cl:58,ct:64,ci:54,cm:'Aggressive',  bt:'Fast',sub:'Pace'},
    {id:'p_wi_09',tid:'t_wi',name:'Kemar R',    age:38,role:'BOWL',bat:16,bowl:84,field:60,wk:0, ps:78, cl:65,ct:70,ci:60,cm:'Experienced', bt:'Fast',sub:'Pace'},
    {id:'p_wi_10',tid:'t_wi',name:'Akeal H',    age:27,role:'BOWL',bat:20,bowl:82,field:64,wk:0, ps:76, cl:52,ct:58,ci:48,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin'},
    {id:'p_wi_11',tid:'t_wi',name:'Kyle M',     age:31,role:'BOWL',bat:22,bowl:84,field:64,wk:0, ps:78, cl:58,ct:64,ci:54,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_wi_12',tid:'t_wi',name:'Evin L',     age:32,role:'BAT', bat:80,bowl:5, field:74,wk:0, ps:76, cl:55,ct:52,ci:58,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_wi_13',tid:'t_wi',name:'Kieran P',   age:35,role:'ALL', bat:68,bowl:74,field:70,wk:0, ps:70, cl:60,ct:64,ci:58,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_wi_14',tid:'t_wi',name:'Fabian A',   age:32,role:'WK',  bat:72,bowl:0, field:70,wk:80,ps:70, cl:55,ct:52,ci:58,cm:'Experienced'},
    {id:'p_wi_15',tid:'t_wi',name:'Yannic C',   age:35,role:'ALL', bat:66,bowl:72,field:68,wk:0, ps:68, cl:55,ct:58,ci:52,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_wi_16',tid:'t_wi',name:'Obed M',     age:26,role:'BOWL',bat:14,bowl:80,field:60,wk:0, ps:74, cl:42,ct:48,ci:40,cm:'Defensive',   bt:'Fast',sub:'Pace'},

    // ── SRI LANKA (t_sl) ──
    {id:'p_sl_01',tid:'t_sl',name:'Pathum N',     age:26,role:'BAT', bat:86,bowl:5, field:78,wk:0, ps:83, cl:68,ct:65,ci:70,cm:'Defensive',     bh:'Left Hand'},
    {id:'p_sl_02',tid:'t_sl',name:'Kusal M',      age:30,role:'WK',  bat:84,bowl:0, field:74,wk:86,ps:81, cl:72,ct:68,ci:74,cm:'Aggressive',    bh:'Left Hand'},
    {id:'p_sl_03',tid:'t_sl',name:'Charith A',    age:27,role:'BAT', bat:83,bowl:5, field:76,wk:0, ps:80, cl:62,ct:60,ci:64,cm:'Defensive',     bh:'Left Hand'},
    {id:'p_sl_04',tid:'t_sl',name:'Dhananjaya S', age:32,role:'ALL', bat:76,bowl:72,field:74,wk:0, ps:74, cl:68,ct:72,ci:65,cm:'Tactical',      bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_sl_05',tid:'t_sl',name:'Wanindu H',    age:25,role:'ALL', bat:70,bowl:80,field:72,wk:0, ps:76, cl:65,ct:70,ci:62,cm:'Tactical',      bh:'Left Hand',bt:'Left Arm Unorthodox',bwh:'Left Arm',sub:'Spin Allrounder'},
    {id:'p_sl_06',tid:'t_sl',name:'Dasun S',      age:32,role:'ALL', bat:72,bowl:68,field:72,wk:0, ps:70, cl:70,ct:68,ci:72,cm:'Inspirational', bt:'Medium Fast'},
    {id:'p_sl_07',tid:'t_sl',name:'Angelo M',     age:36,role:'ALL', bat:74,bowl:70,field:74,wk:0, ps:72, cl:72,ct:70,ci:74,cm:'Experienced',   bt:'Medium Fast'},
    {id:'p_sl_08',tid:'t_sl',name:'Matheesha P',  age:22,role:'BOWL',bat:16,bowl:86,field:64,wk:0, ps:80, cl:50,ct:56,ci:46,cm:'Aggressive',   bt:'Fast',sub:'Pace'},
    {id:'p_sl_09',tid:'t_sl',name:'Dushmantha C', age:29,role:'BOWL',bat:18,bowl:84,field:64,wk:0, ps:78, cl:52,ct:58,ci:48,cm:'Defensive',    bt:'Fast',sub:'Pace'},
    {id:'p_sl_10',tid:'t_sl',name:'Maheesh T',    age:25,role:'BOWL',bat:14,bowl:84,field:60,wk:0, ps:78, cl:48,ct:54,ci:44,cm:'Defensive',    bt:'Fast',sub:'Pace'},
    {id:'p_sl_11',tid:'t_sl',name:'Jeffrey V',    age:34,role:'BOWL',bat:20,bowl:82,field:62,wk:0, ps:76, cl:60,ct:66,ci:56,cm:'Experienced',  bt:'Off Spin',sub:'Spin'},
    {id:'p_sl_12',tid:'t_sl',name:'Chamika K',    age:27,role:'ALL', bat:66,bowl:76,field:68,wk:0, ps:72, cl:55,ct:60,ci:52,cm:'Impulsive',    bt:'Medium Fast'},
    {id:'p_sl_13',tid:'t_sl',name:'Kusal P',      age:33,role:'BAT', bat:80,bowl:5, field:72,wk:0, ps:76, cl:58,ct:55,ci:60,cm:'Defensive'},
    {id:'p_sl_14',tid:'t_sl',name:'Dinesh C',     age:39,role:'WK',  bat:76,bowl:0, field:72,wk:82,ps:74, cl:70,ct:68,ci:72,cm:'Experienced'},
    {id:'p_sl_15',tid:'t_sl',name:'Niroshan D',   age:31,role:'WK',  bat:74,bowl:0, field:70,wk:80,ps:72, cl:62,ct:60,ci:64,cm:'Experienced', bh:'Left Hand'},
    {id:'p_sl_16',tid:'t_sl',name:'Lahiru K',     age:31,role:'BOWL',bat:18,bowl:80,field:60,wk:0, ps:74, cl:48,ct:54,ci:44,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},

    // ── BANGLADESH (t_ban) ──
    {id:'p_ban_01',tid:'t_ban',name:'Shakib A',     age:36,role:'ALL', bat:80,bowl:82,field:74,wk:0, ps:82, cl:85,ct:88,ci:82,cm:'Tactical',    bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin Allrounder'},
    {id:'p_ban_02',tid:'t_ban',name:'Mushfiqur R',  age:36,role:'WK',  bat:82,bowl:0, field:72,wk:84,ps:80, cl:78,ct:75,ci:80,cm:'Experienced'},
    {id:'p_ban_03',tid:'t_ban',name:'Tamim I',      age:34,role:'BAT', bat:84,bowl:5, field:74,wk:0, ps:80, cl:72,ct:68,ci:74,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_ban_04',tid:'t_ban',name:'Liton D',      age:29,role:'WK',  bat:80,bowl:0, field:74,wk:82,ps:78, cl:62,ct:60,ci:64,cm:'Defensive'},
    {id:'p_ban_05',tid:'t_ban',name:'Mehidy H',     age:27,role:'ALL', bat:68,bowl:78,field:70,wk:0, ps:74, cl:60,ct:65,ci:58,cm:'Tactical',    bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_ban_06',tid:'t_ban',name:'Mustafizur R', age:28,role:'BOWL',bat:14,bowl:84,field:62,wk:0, ps:78, cl:55,ct:62,ci:50,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Medium',bwh:'Left Arm',sub:'Pace'},
    {id:'p_ban_07',tid:'t_ban',name:'Taskin A',     age:29,role:'BOWL',bat:16,bowl:82,field:62,wk:0, ps:76, cl:50,ct:56,ci:46,cm:'Defensive',   bt:'Fast',sub:'Pace'},
    {id:'p_ban_08',tid:'t_ban',name:'Shoriful I',   age:23,role:'BOWL',bat:14,bowl:80,field:60,wk:0, ps:74, cl:42,ct:48,ci:40,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Fast',bwh:'Left Arm',sub:'Pace'},
    {id:'p_ban_09',tid:'t_ban',name:'Mahmudullah',  age:38,role:'ALL', bat:72,bowl:66,field:70,wk:0, ps:70, cl:68,ct:65,ci:70,cm:'Experienced', bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_ban_10',tid:'t_ban',name:'Towhid H',     age:22,role:'BAT', bat:76,bowl:5, field:72,wk:0, ps:72, cl:45,ct:42,ci:48,cm:'Defensive'},
    {id:'p_ban_11',tid:'t_ban',name:'Najmul H',     age:25,role:'BAT', bat:78,bowl:5, field:72,wk:0, ps:74, cl:52,ct:48,ci:55,cm:'Defensive',   bh:'Left Hand'},
    {id:'p_ban_12',tid:'t_ban',name:'Taijul I',     age:32,role:'BOWL',bat:18,bowl:78,field:62,wk:0, ps:72, cl:55,ct:62,ci:50,cm:'Tactical',    bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin'},
    {id:'p_ban_13',tid:'t_ban',name:'Afif H',       age:24,role:'ALL', bat:70,bowl:62,field:70,wk:0, ps:68, cl:48,ct:50,ci:46,cm:'Impulsive',   bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm'},
    {id:'p_ban_14',tid:'t_ban',name:'Rishad H',     age:21,role:'BOWL',bat:16,bowl:76,field:60,wk:0, ps:70, cl:38,ct:44,ci:36,cm:'Defensive',   bt:'Leg Spin',sub:'Spin'},
    {id:'p_ban_15',tid:'t_ban',name:'Nasum A',      age:28,role:'BOWL',bat:14,bowl:78,field:60,wk:0, ps:72, cl:45,ct:52,ci:42,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Orthodox',bwh:'Left Arm',sub:'Spin'},
    {id:'p_ban_16',tid:'t_ban',name:'Nurul H',      age:31,role:'WK',  bat:70,bowl:0, field:68,wk:78,ps:68, cl:52,ct:50,ci:54,cm:'Experienced'},

    // ── AFGHANISTAN (t_afg) ──
    {id:'p_afg_01',tid:'t_afg',name:'Rashid K',      age:25,role:'ALL', bat:62,bowl:94,field:72,wk:0, ps:88, cl:88,ct:92,ci:86,cm:'Tactical',    bt:'Leg Spin',bwh:'Right Arm',sub:'Spin Allrounder',bp:'Death'},
    {id:'p_afg_02',tid:'t_afg',name:'Mohammad N',    age:26,role:'BOWL',bat:20,bowl:90,field:66,wk:0, ps:85, cl:72,ct:78,ci:68,cm:'Tactical',    bt:'Off Spin',sub:'Spin',bp:'Middle'},
    {id:'p_afg_03',tid:'t_afg',name:'Mujeeb R',      age:22,role:'BOWL',bat:14,bowl:86,field:62,wk:0, ps:80, cl:58,ct:65,ci:52,cm:'Defensive',   bt:'Off Spin',sub:'Spin',bp:'Powerplay'},
    {id:'p_afg_04',tid:'t_afg',name:'Ibrahim Z',     age:24,role:'BAT', bat:82,bowl:5, field:74,wk:0, ps:78, cl:65,ct:62,ci:68,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_afg_05',tid:'t_afg',name:'Rahmanullah G', age:22,role:'WK',  bat:80,bowl:0, field:72,wk:84,ps:78, cl:60,ct:58,ci:62,cm:'Aggressive'},
    {id:'p_afg_06',tid:'t_afg',name:'Hazratullah Z', age:28,role:'BAT', bat:78,bowl:5, field:72,wk:0, ps:75, cl:58,ct:55,ci:60,cm:'Defensive',   bh:'Left Hand'},
    {id:'p_afg_07',tid:'t_afg',name:'Azmatullah O',  age:26,role:'ALL', bat:74,bowl:64,field:70,wk:0, ps:72, cl:58,ct:60,ci:55,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_afg_08',tid:'t_afg',name:'Mohammad S',    age:30,role:'BOWL',bat:16,bowl:82,field:62,wk:0, ps:76, cl:50,ct:56,ci:46,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_afg_09',tid:'t_afg',name:'Naveen U',      age:24,role:'BOWL',bat:14,bowl:80,field:60,wk:0, ps:74, cl:45,ct:50,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_afg_10',tid:'t_afg',name:'Gulbadin N',    age:30,role:'ALL', bat:66,bowl:72,field:68,wk:0, ps:70, cl:55,ct:58,ci:52,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_afg_11',tid:'t_afg',name:'Najibullah Z',  age:30,role:'BAT', bat:76,bowl:5, field:70,wk:0, ps:73, cl:55,ct:52,ci:58,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_afg_12',tid:'t_afg',name:'Mohammad I',    age:27,role:'BOWL',bat:14,bowl:78,field:60,wk:0, ps:72, cl:42,ct:48,ci:40,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_afg_13',tid:'t_afg',name:'Fareed A',      age:25,role:'ALL', bat:64,bowl:74,field:66,wk:0, ps:70, cl:48,ct:52,ci:45,cm:'Tactical',    bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_afg_14',tid:'t_afg',name:'Karim J',       age:22,role:'BAT', bat:74,bowl:5, field:70,wk:0, ps:70, cl:42,ct:40,ci:44,cm:'Defensive'},
    {id:'p_afg_15',tid:'t_afg',name:'Noor A',        age:20,role:'BOWL',bat:14,bowl:76,field:60,wk:0, ps:70, cl:38,ct:44,ci:36,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_afg_16',tid:'t_afg',name:'Ikram A',       age:25,role:'WK',  bat:68,bowl:0, field:66,wk:76,ps:66, cl:45,ct:42,ci:48,cm:'Experienced'},

    // ── ZIMBABWE (t_zim) ──
    {id:'p_zim_01',tid:'t_zim',name:'Sikandar R',    age:37,role:'ALL', bat:76,bowl:72,field:70,wk:0, ps:74, cl:75,ct:72,ci:78,cm:'Experienced', bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_zim_02',tid:'t_zim',name:'Sean W',        age:36,role:'BAT', bat:74,bowl:5, field:68,wk:0, ps:70, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_zim_03',tid:'t_zim',name:'Craig E',       age:36,role:'BAT', bat:72,bowl:5, field:66,wk:0, ps:68, cl:62,ct:58,ci:65,cm:'Experienced'},
    {id:'p_zim_04',tid:'t_zim',name:'Regis C',       age:36,role:'BAT', bat:74,bowl:5, field:68,wk:0, ps:70, cl:60,ct:56,ci:62,cm:'Defensive'},
    {id:'p_zim_05',tid:'t_zim',name:'Ryan B',        age:27,role:'WK',  bat:70,bowl:0, field:66,wk:76,ps:68, cl:52,ct:50,ci:54,cm:'Experienced'},
    {id:'p_zim_06',tid:'t_zim',name:'Milton S',      age:26,role:'BAT', bat:70,bowl:5, field:64,wk:0, ps:66, cl:42,ct:40,ci:44,cm:'Defensive'},
    {id:'p_zim_07',tid:'t_zim',name:'Blessing M',    age:27,role:'BOWL',bat:14,bowl:78,field:60,wk:0, ps:72, cl:45,ct:52,ci:42,cm:'Aggressive',  bt:'Medium Fast',sub:'Pace'},
    {id:'p_zim_08',tid:'t_zim',name:'Tendai C',      age:37,role:'BOWL',bat:16,bowl:76,field:58,wk:0, ps:70, cl:58,ct:64,ci:54,cm:'Experienced', bt:'Medium Fast',sub:'Pace'},
    {id:'p_zim_09',tid:'t_zim',name:'Luke J',        age:35,role:'ALL', bat:66,bowl:68,field:66,wk:0, ps:66, cl:55,ct:58,ci:52,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_zim_10',tid:'t_zim',name:'Tadiwanashe M', age:24,role:'BAT', bat:68,bowl:5, field:64,wk:0, ps:64, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_zim_11',tid:'t_zim',name:'Victor N',      age:27,role:'BOWL',bat:14,bowl:74,field:58,wk:0, ps:68, cl:42,ct:48,ci:40,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_zim_12',tid:'t_zim',name:'Clive M',       age:29,role:'ALL', bat:62,bowl:66,field:62,wk:0, ps:62, cl:42,ct:46,ci:40,cm:'Impulsive',   bt:'Medium Fast'},
    {id:'p_zim_13',tid:'t_zim',name:'Donald T',      age:26,role:'BOWL',bat:12,bowl:72,field:56,wk:0, ps:66, cl:38,ct:44,ci:36,cm:'Defensive',   bt:'Medium Fast',sub:'Pace'},
    {id:'p_zim_14',tid:'t_zim',name:'Dion M',        age:28,role:'ALL', bat:60,bowl:64,field:60,wk:0, ps:60, cl:38,ct:42,ci:36,cm:'Impulsive',   bt:'Off Spin'},
    {id:'p_zim_15',tid:'t_zim',name:'Ainsley N',     age:25,role:'BAT', bat:62,bowl:5, field:58,wk:0, ps:58, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_zim_16',tid:'t_zim',name:'Wellington M',  age:30,role:'WK',  bat:60,bowl:0, field:60,wk:68,ps:58, cl:40,ct:38,ci:42,cm:'Defensive'},

    // ── IRELAND (t_ire) ──
    {id:'p_ire_01',tid:'t_ire',name:'Paul S',     age:36,role:'BAT', bat:76,bowl:5, field:68,wk:0, ps:72, cl:72,ct:68,ci:74,cm:'Experienced'},
    {id:'p_ire_02',tid:'t_ire',name:'Andrew B',   age:34,role:'ALL', bat:70,bowl:72,field:68,wk:0, ps:70, cl:65,ct:62,ci:68,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_ire_03',tid:'t_ire',name:'Harry T',    age:25,role:'BAT', bat:72,bowl:5, field:68,wk:0, ps:68, cl:55,ct:52,ci:58,cm:'Aggressive'},
    {id:'p_ire_04',tid:'t_ire',name:'Lorcan T',   age:29,role:'WK',  bat:70,bowl:0, field:66,wk:76,ps:68, cl:60,ct:58,ci:62,cm:'Aggressive'},
    {id:'p_ire_05',tid:'t_ire',name:'George D',   age:26,role:'BOWL',bat:16,bowl:76,field:60,wk:0, ps:70, cl:52,ct:58,ci:48,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ire_06',tid:'t_ire',name:'Barry M',    age:32,role:'ALL', bat:66,bowl:70,field:66,wk:0, ps:66, cl:55,ct:58,ci:52,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_ire_07',tid:'t_ire',name:'Simi S',     age:28,role:'ALL', bat:64,bowl:72,field:64,wk:0, ps:66, cl:50,ct:55,ci:48,cm:'Tactical',    bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_ire_08',tid:'t_ire',name:'Craig Y',    age:34,role:'BOWL',bat:14,bowl:74,field:58,wk:0, ps:68, cl:52,ct:58,ci:48,cm:'Experienced', bt:'Fast Medium',sub:'Pace'},
    {id:'p_ire_09',tid:'t_ire',name:'Fionn H',    age:24,role:'BOWL',bat:12,bowl:72,field:56,wk:0, ps:66, cl:35,ct:42,ci:32,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ire_10',tid:'t_ire',name:'Josh L',     age:26,role:'BOWL',bat:14,bowl:72,field:58,wk:0, ps:66, cl:40,ct:46,ci:38,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ire_11',tid:'t_ire',name:'Gareth D',   age:29,role:'ALL', bat:62,bowl:68,field:62,wk:0, ps:62, cl:42,ct:46,ci:40,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_ire_12',tid:'t_ire',name:'Stephen D',  age:27,role:'BAT', bat:68,bowl:5, field:62,wk:0, ps:64, cl:45,ct:42,ci:48,cm:'Defensive'},
    {id:'p_ire_13',tid:'t_ire',name:'Mark A',     age:31,role:'BOWL',bat:12,bowl:70,field:56,wk:0, ps:64, cl:48,ct:54,ci:44,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_ire_14',tid:'t_ire',name:'Neil R',     age:36,role:'BOWL',bat:16,bowl:70,field:58,wk:0, ps:64, cl:48,ct:54,ci:44,cm:'Experienced', bt:'Off Spin',sub:'Spin'},
    {id:'p_ire_15',tid:'t_ire',name:'James M',    age:23,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_ire_16',tid:'t_ire',name:'Tyrone K',   age:25,role:'WK',  bat:60,bowl:0, field:58,wk:68,ps:58, cl:35,ct:32,ci:38,cm:'Defensive'},

    // ── SCOTLAND (t_sco) ──
    {id:'p_sco_01',tid:'t_sco',name:'Kyle C',     age:33,role:'BAT', bat:72,bowl:5, field:66,wk:0, ps:68, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_sco_02',tid:'t_sco',name:'Richie B',   age:34,role:'BAT', bat:70,bowl:5, field:64,wk:0, ps:66, cl:60,ct:58,ci:62,cm:'Experienced'},
    {id:'p_sco_03',tid:'t_sco',name:'Matthew C',  age:29,role:'WK',  bat:68,bowl:0, field:64,wk:74,ps:66, cl:55,ct:52,ci:58,cm:'Experienced'},
    {id:'p_sco_04',tid:'t_sco',name:'Michael L',  age:34,role:'ALL', bat:66,bowl:68,field:64,wk:0, ps:64, cl:55,ct:58,ci:52,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_sco_05',tid:'t_sco',name:'Brad W',     age:33,role:'BOWL',bat:14,bowl:74,field:58,wk:0, ps:68, cl:52,ct:58,ci:48,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_sco_06',tid:'t_sco',name:'Mark W',     age:36,role:'ALL', bat:64,bowl:66,field:62,wk:0, ps:62, cl:50,ct:54,ci:48,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_sco_07',tid:'t_sco',name:'Safyaan S',  age:30,role:'BOWL',bat:14,bowl:72,field:58,wk:0, ps:66, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_sco_08',tid:'t_sco',name:'Chris G',    age:28,role:'BOWL',bat:12,bowl:70,field:56,wk:0, ps:64, cl:40,ct:46,ci:38,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_sco_09',tid:'t_sco',name:'Hamish G',   age:27,role:'ALL', bat:60,bowl:66,field:60,wk:0, ps:60, cl:40,ct:44,ci:38,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_sco_10',tid:'t_sco',name:'George M',   age:24,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_sco_11',tid:'t_sco',name:'Josh D',     age:23,role:'BOWL',bat:12,bowl:68,field:54,wk:0, ps:62, cl:35,ct:42,ci:32,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_sco_12',tid:'t_sco',name:'Alasdair E', age:26,role:'ALL', bat:58,bowl:62,field:58,wk:0, ps:58, cl:36,ct:40,ci:34,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_sco_13',tid:'t_sco',name:'Oliver H',   age:25,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_sco_14',tid:'t_sco',name:'Dylan B',    age:22,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:30,ct:36,ci:28,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_sco_15',tid:'t_sco',name:'Tom M',      age:24,role:'WK',  bat:58,bowl:0, field:56,wk:66,ps:56, cl:35,ct:32,ci:38,cm:'Defensive'},
    {id:'p_sco_16',tid:'t_sco',name:'Angus G',    age:26,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:32,ct:30,ci:34,cm:'Defensive'},

    // ── NETHERLANDS (t_ned) ──
    {id:'p_ned_01',tid:'t_ned',name:'Max O',       age:31,role:'BAT', bat:74,bowl:5, field:66,wk:0, ps:70, cl:65,ct:62,ci:68,cm:'Experienced'},
    {id:'p_ned_02',tid:'t_ned',name:'Bas J',       age:29,role:'WK',  bat:70,bowl:0, field:64,wk:76,ps:68, cl:60,ct:58,ci:62,cm:'Experienced', bh:'Left Hand'},
    {id:'p_ned_03',tid:'t_ned',name:'Vikram S',    age:32,role:'BAT', bat:70,bowl:10,field:66,wk:0, ps:66, cl:55,ct:52,ci:58,cm:'Defensive'},
    {id:'p_ned_04',tid:'t_ned',name:'Tobias V',    age:28,role:'ALL', bat:64,bowl:70,field:64,wk:0, ps:64, cl:52,ct:56,ci:50,cm:'Tactical',    bt:'Medium Fast'},
    {id:'p_ned_05',tid:'t_ned',name:'Ryan K',      age:33,role:'BOWL',bat:16,bowl:76,field:58,wk:0, ps:70, cl:55,ct:62,ci:50,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ned_06',tid:'t_ned',name:'Logan V',     age:27,role:'BOWL',bat:14,bowl:72,field:56,wk:0, ps:66, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ned_07',tid:'t_ned',name:'Fred K',      age:30,role:'ALL', bat:62,bowl:66,field:62,wk:0, ps:62, cl:45,ct:50,ci:42,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_ned_08',tid:'t_ned',name:'Teja N',      age:27,role:'BOWL',bat:12,bowl:70,field:54,wk:0, ps:64, cl:40,ct:48,ci:38,cm:'Tactical',    bt:'Off Spin',sub:'Spin'},
    {id:'p_ned_09',tid:'t_ned',name:'Scott E',     age:26,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_ned_10',tid:'t_ned',name:'Roelof V',    age:38,role:'ALL', bat:60,bowl:68,field:60,wk:0, ps:62, cl:52,ct:56,ci:50,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_ned_11',tid:'t_ned',name:'Brandon G',   age:28,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:38,ct:44,ci:36,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ned_12',tid:'t_ned',name:'Tim P',       age:25,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_ned_13',tid:'t_ned',name:'Clayton F',   age:29,role:'ALL', bat:56,bowl:62,field:56,wk:0, ps:56, cl:38,ct:42,ci:36,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_ned_14',tid:'t_ned',name:'Sybrand E',   age:31,role:'BAT', bat:62,bowl:5, field:58,wk:0, ps:58, cl:42,ct:40,ci:44,cm:'Defensive'},
    {id:'p_ned_15',tid:'t_ned',name:'Aryan D',     age:23,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_ned_16',tid:'t_ned',name:'Neil B',      age:30,role:'WK',  bat:58,bowl:0, field:56,wk:66,ps:56, cl:38,ct:36,ci:40,cm:'Experienced'},

    // ── UAE (t_uae) ──
    {id:'p_uae_01',tid:'t_uae',name:'Muhammad W', age:27,role:'BAT', bat:72,bowl:5, field:64,wk:0, ps:68, cl:58,ct:55,ci:60,cm:'Experienced'},
    {id:'p_uae_02',tid:'t_uae',name:'Chirag S',   age:29,role:'WK',  bat:68,bowl:0, field:62,wk:74,ps:66, cl:55,ct:52,ci:58,cm:'Experienced'},
    {id:'p_uae_03',tid:'t_uae',name:'Aryan L',    age:25,role:'BAT', bat:66,bowl:5, field:62,wk:0, ps:62, cl:42,ct:40,ci:44,cm:'Defensive'},
    {id:'p_uae_04',tid:'t_uae',name:'Basil H',    age:28,role:'BOWL',bat:14,bowl:74,field:56,wk:0, ps:68, cl:48,ct:55,ci:44,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_uae_05',tid:'t_uae',name:'Zahoor K',   age:30,role:'BOWL',bat:12,bowl:72,field:54,wk:0, ps:66, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_uae_06',tid:'t_uae',name:'Junaid S',   age:27,role:'ALL', bat:60,bowl:66,field:60,wk:0, ps:62, cl:42,ct:46,ci:40,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_uae_07',tid:'t_uae',name:'Rohan M',    age:26,role:'BAT', bat:62,bowl:5, field:58,wk:0, ps:58, cl:36,ct:34,ci:38,cm:'Defensive'},
    {id:'p_uae_08',tid:'t_uae',name:'Sultan A',   age:31,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:42,ct:48,ci:40,cm:'Tactical',    bt:'Off Spin',sub:'Spin'},
    {id:'p_uae_09',tid:'t_uae',name:'Vriitya A',  age:22,role:'WK',  bat:64,bowl:0, field:60,wk:70,ps:62, cl:45,ct:42,ci:48,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_uae_10',tid:'t_uae',name:'Kashif D',   age:29,role:'ALL', bat:58,bowl:62,field:58,wk:0, ps:58, cl:38,ct:42,ci:36,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_uae_11',tid:'t_uae',name:'Aayan K',    age:24,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_uae_12',tid:'t_uae',name:'Alishan S',  age:26,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_uae_13',tid:'t_uae',name:'Rahul B',    age:28,role:'ALL', bat:56,bowl:60,field:56,wk:0, ps:56, cl:35,ct:38,ci:32,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_uae_14',tid:'t_uae',name:'Karthik M',  age:25,role:'BOWL',bat:10,bowl:64,field:52,wk:0, ps:58, cl:30,ct:36,ci:28,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_uae_15',tid:'t_uae',name:'Dhruv P',    age:23,role:'BAT', bat:58,bowl:5, field:54,wk:0, ps:54, cl:28,ct:26,ci:30,cm:'Defensive'},
    {id:'p_uae_16',tid:'t_uae',name:'Nilansh K',  age:21,role:'ALL', bat:54,bowl:58,field:52,wk:0, ps:52, cl:28,ct:32,ci:26,cm:'Impulsive',   bt:'Off Spin'},

    // ── NEPAL (t_nep) ──
    {id:'p_nep_01',tid:'t_nep',name:'Rohit P',    age:26,role:'BOWL',bat:22,bowl:84,field:64,wk:0, ps:78, cl:68,ct:74,ci:64,cm:'Tactical',    bt:'Leg Spin',sub:'Spin',bp:'Powerplay'},
    {id:'p_nep_02',tid:'t_nep',name:'Kushal B',   age:24,role:'BAT', bat:74,bowl:5, field:66,wk:0, ps:70, cl:55,ct:52,ci:58,cm:'Aggressive',  bh:'Left Hand'},
    {id:'p_nep_03',tid:'t_nep',name:'Aarif S',    age:23,role:'BOWL',bat:14,bowl:78,field:58,wk:0, ps:72, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_nep_04',tid:'t_nep',name:'Sandeep L',  age:27,role:'BOWL',bat:12,bowl:76,field:56,wk:0, ps:70, cl:42,ct:48,ci:40,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nep_05',tid:'t_nep',name:'Dipendra S', age:26,role:'ALL', bat:68,bowl:70,field:66,wk:0, ps:68, cl:52,ct:56,ci:50,cm:'Tactical',    bt:'Off Spin',sub:'Spin Allrounder'},
    {id:'p_nep_06',tid:'t_nep',name:'Aasif S',    age:25,role:'ALL', bat:62,bowl:68,field:62,wk:0, ps:64, cl:42,ct:46,ci:40,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_nep_07',tid:'t_nep',name:'Sagar P',    age:22,role:'BOWL',bat:12,bowl:72,field:54,wk:0, ps:66, cl:35,ct:42,ci:32,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nep_08',tid:'t_nep',name:'Binod B',    age:29,role:'WK',  bat:66,bowl:0, field:62,wk:72,ps:64, cl:48,ct:46,ci:50,cm:'Experienced'},
    {id:'p_nep_09',tid:'t_nep',name:'Kushal M',   age:24,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:36,ct:34,ci:38,cm:'Defensive'},
    {id:'p_nep_10',tid:'t_nep',name:'Sompal K',   age:28,role:'ALL', bat:58,bowl:66,field:58,wk:0, ps:60, cl:38,ct:42,ci:36,cm:'Defensive',   bt:'Fast Medium'},
    {id:'p_nep_11',tid:'t_nep',name:'Gulshan J',  age:23,role:'BOWL',bat:10,bowl:68,field:52,wk:0, ps:62, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Leg Spin',sub:'Spin'},
    {id:'p_nep_12',tid:'t_nep',name:'Pratish GC', age:25,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:30,ct:28,ci:32,cm:'Defensive'},
    {id:'p_nep_13',tid:'t_nep',name:'Lalit B',    age:22,role:'ALL', bat:56,bowl:62,field:56,wk:0, ps:56, cl:32,ct:36,ci:30,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_nep_14',tid:'t_nep',name:'Shahab A',   age:24,role:'BOWL',bat:10,bowl:64,field:52,wk:0, ps:58, cl:28,ct:34,ci:26,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_nep_15',tid:'t_nep',name:'Karan KC',   age:21,role:'BAT', bat:58,bowl:5, field:54,wk:0, ps:54, cl:26,ct:24,ci:28,cm:'Defensive'},
    {id:'p_nep_16',tid:'t_nep',name:'Pawan S',    age:23,role:'WK',  bat:56,bowl:0, field:52,wk:64,ps:52, cl:32,ct:30,ci:34,cm:'Defensive'},

    // ── USA (t_usa) ──
    {id:'p_usa_01',tid:'t_usa',name:'Monank P',   age:30,role:'WK',  bat:72,bowl:0, field:66,wk:76,ps:70, cl:62,ct:60,ci:64,cm:'Experienced'},
    {id:'p_usa_02',tid:'t_usa',name:'Aaron J',    age:35,role:'BAT', bat:70,bowl:5, field:66,wk:0, ps:68, cl:58,ct:55,ci:60,cm:'Experienced'},
    {id:'p_usa_03',tid:'t_usa',name:'Andries G',  age:29,role:'ALL', bat:64,bowl:68,field:62,wk:0, ps:66, cl:52,ct:56,ci:50,cm:'Tactical',    bt:'Medium Fast'},
    {id:'p_usa_04',tid:'t_usa',name:'Saurabh N',  age:27,role:'BOWL',bat:12,bowl:74,field:56,wk:0, ps:68, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_usa_05',tid:'t_usa',name:'Ali K',      age:26,role:'BOWL',bat:12,bowl:72,field:56,wk:0, ps:66, cl:42,ct:48,ci:40,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_usa_06',tid:'t_usa',name:'Corey A',    age:34,role:'ALL', bat:62,bowl:66,field:62,wk:0, ps:64, cl:48,ct:52,ci:46,cm:'Experienced', bt:'Medium Fast'},
    {id:'p_usa_07',tid:'t_usa',name:'Steven T',   age:38,role:'BAT', bat:68,bowl:5, field:62,wk:0, ps:64, cl:52,ct:50,ci:54,cm:'Experienced'},
    {id:'p_usa_08',tid:'t_usa',name:'Harmeet S',  age:27,role:'BOWL',bat:12,bowl:70,field:54,wk:0, ps:64, cl:38,ct:44,ci:36,cm:'Defensive',   bh:'Left Hand',bt:'Left Arm Medium',bwh:'Left Arm',sub:'Pace'},
    {id:'p_usa_09',tid:'t_usa',name:'Milind K',   age:29,role:'ALL', bat:60,bowl:64,field:60,wk:0, ps:62, cl:40,ct:44,ci:38,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_usa_10',tid:'t_usa',name:'Xavier M',   age:26,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_usa_11',tid:'t_usa',name:'Ryan S',     age:24,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:35,ct:42,ci:32,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_usa_12',tid:'t_usa',name:'Nisarg P',   age:25,role:'ALL', bat:58,bowl:62,field:58,wk:0, ps:60, cl:36,ct:40,ci:34,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_usa_13',tid:'t_usa',name:'Jessy S',    age:28,role:'WK',  bat:62,bowl:0, field:60,wk:70,ps:60, cl:42,ct:40,ci:44,cm:'Experienced'},
    {id:'p_usa_14',tid:'t_usa',name:'Gajanand S', age:30,role:'BAT', bat:62,bowl:5, field:58,wk:0, ps:58, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_usa_15',tid:'t_usa',name:'Juanoy D',   age:27,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_usa_16',tid:'t_usa',name:'Shayan J',   age:22,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:28,ct:26,ci:30,cm:'Defensive'},

    // ── CANADA (t_can) ──
    {id:'p_can_01',tid:'t_can',name:'Navneet D',    age:29,role:'BAT', bat:70,bowl:5, field:64,wk:0, ps:66, cl:55,ct:52,ci:58,cm:'Experienced'},
    {id:'p_can_02',tid:'t_can',name:'Shreyas M',    age:27,role:'WK',  bat:66,bowl:0, field:62,wk:72,ps:64, cl:50,ct:48,ci:52,cm:'Experienced'},
    {id:'p_can_03',tid:'t_can',name:'Saad B',       age:25,role:'BOWL',bat:12,bowl:72,field:54,wk:0, ps:66, cl:40,ct:46,ci:38,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_can_04',tid:'t_can',name:'Dilon H',      age:28,role:'ALL', bat:62,bowl:64,field:60,wk:0, ps:62, cl:42,ct:46,ci:40,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_can_05',tid:'t_can',name:'Ravinderpal S',age:26,role:'BAT', bat:66,bowl:5, field:62,wk:0, ps:62, cl:42,ct:40,ci:44,cm:'Defensive'},
    {id:'p_can_06',tid:'t_can',name:'Pargat S',     age:30,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:38,ct:44,ci:36,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_can_07',tid:'t_can',name:'Hiral P',      age:28,role:'ALL', bat:60,bowl:62,field:58,wk:0, ps:60, cl:38,ct:42,ci:36,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_can_08',tid:'t_can',name:'Jeremy G',     age:26,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_can_09',tid:'t_can',name:'Rizwan C',     age:27,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:36,ct:34,ci:38,cm:'Defensive'},
    {id:'p_can_10',tid:'t_can',name:'Harsh T',      age:24,role:'ALL', bat:58,bowl:62,field:56,wk:0, ps:58, cl:35,ct:38,ci:32,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_can_11',tid:'t_can',name:'Junaid S',     age:25,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_can_12',tid:'t_can',name:'Dillon H',     age:29,role:'ALL', bat:58,bowl:60,field:56,wk:0, ps:58, cl:35,ct:38,ci:32,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_can_13',tid:'t_can',name:'Nikhil D',     age:23,role:'BAT', bat:62,bowl:5, field:58,wk:0, ps:58, cl:32,ct:30,ci:34,cm:'Defensive'},
    {id:'p_can_14',tid:'t_can',name:'Kaleem S',     age:27,role:'BOWL',bat:10,bowl:64,field:52,wk:0, ps:58, cl:30,ct:36,ci:28,cm:'Defensive',   bt:'Off Spin',sub:'Spin'},
    {id:'p_can_15',tid:'t_can',name:'Shubham S',    age:22,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:28,ct:26,ci:30,cm:'Defensive'},
    {id:'p_can_16',tid:'t_can',name:'Hamza T',      age:24,role:'WK',  bat:58,bowl:0, field:56,wk:66,ps:56, cl:32,ct:30,ci:34,cm:'Defensive'},

    // ── PAPUA NEW GUINEA (t_png) ──
    {id:'p_png_01',tid:'t_png',name:'Assad V',    age:29,role:'BAT', bat:70,bowl:5, field:64,wk:0, ps:66, cl:52,ct:50,ci:54,cm:'Experienced'},
    {id:'p_png_02',tid:'t_png',name:'Charles A',  age:32,role:'WK',  bat:66,bowl:0, field:62,wk:72,ps:64, cl:50,ct:48,ci:52,cm:'Experienced'},
    {id:'p_png_03',tid:'t_png',name:'Norman V',   age:30,role:'BOWL',bat:14,bowl:74,field:56,wk:0, ps:68, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_png_04',tid:'t_png',name:'Chad S',     age:27,role:'ALL', bat:62,bowl:66,field:60,wk:0, ps:62, cl:42,ct:46,ci:40,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_png_05',tid:'t_png',name:'Kiplin D',   age:26,role:'BAT', bat:64,bowl:5, field:60,wk:0, ps:60, cl:38,ct:36,ci:40,cm:'Defensive'},
    {id:'p_png_06',tid:'t_png',name:'Simon A',    age:31,role:'BOWL',bat:12,bowl:70,field:54,wk:0, ps:64, cl:40,ct:46,ci:38,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_png_07',tid:'t_png',name:'John R',     age:28,role:'ALL', bat:58,bowl:62,field:58,wk:0, ps:58, cl:36,ct:40,ci:34,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_png_08',tid:'t_png',name:'Frank N',    age:25,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_png_09',tid:'t_png',name:'Jack G',     age:24,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:30,ct:28,ci:32,cm:'Defensive'},
    {id:'p_png_10',tid:'t_png',name:'Raymond V',  age:27,role:'ALL', bat:56,bowl:60,field:56,wk:0, ps:56, cl:34,ct:38,ci:32,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_png_11',tid:'t_png',name:'Lega S',     age:26,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:30,ct:36,ci:28,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_png_12',tid:'t_png',name:'Tony U',     age:28,role:'BAT', bat:58,bowl:5, field:54,wk:0, ps:54, cl:28,ct:26,ci:30,cm:'Defensive'},
    {id:'p_png_13',tid:'t_png',name:'Willie T',   age:23,role:'ALL', bat:54,bowl:58,field:54,wk:0, ps:52, cl:28,ct:32,ci:26,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_png_14',tid:'t_png',name:'Hiri H',     age:25,role:'BOWL',bat:10,bowl:62,field:50,wk:0, ps:56, cl:26,ct:32,ci:24,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_png_15',tid:'t_png',name:'Kevin M',    age:22,role:'WK',  bat:56,bowl:0, field:52,wk:64,ps:54, cl:30,ct:28,ci:32,cm:'Defensive'},
    {id:'p_png_16',tid:'t_png',name:'Peter H',    age:24,role:'BAT', bat:56,bowl:5, field:52,wk:0, ps:52, cl:26,ct:24,ci:28,cm:'Defensive'},

    // ── NAMIBIA (t_nam) ──
    {id:'p_nam_01',tid:'t_nam',name:'Gerhard E',  age:34,role:'BAT', bat:72,bowl:5, field:64,wk:0, ps:68, cl:62,ct:60,ci:64,cm:'Experienced'},
    {id:'p_nam_02',tid:'t_nam',name:'Zane G',     age:29,role:'WK',  bat:68,bowl:0, field:62,wk:74,ps:66, cl:58,ct:55,ci:60,cm:'Experienced', bh:'Left Hand'},
    {id:'p_nam_03',tid:'t_nam',name:'Jan N F',    age:32,role:'BAT', bat:68,bowl:5, field:62,wk:0, ps:64, cl:52,ct:50,ci:54,cm:'Experienced'},
    {id:'p_nam_04',tid:'t_nam',name:'David W',    age:28,role:'ALL', bat:62,bowl:66,field:62,wk:0, ps:62, cl:48,ct:52,ci:46,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_nam_05',tid:'t_nam',name:'Ruben T',    age:27,role:'BOWL',bat:14,bowl:74,field:56,wk:0, ps:68, cl:45,ct:52,ci:42,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nam_06',tid:'t_nam',name:'Ben S',      age:31,role:'ALL', bat:60,bowl:64,field:60,wk:0, ps:60, cl:40,ct:44,ci:38,cm:'Defensive',   bt:'Medium Fast'},
    {id:'p_nam_07',tid:'t_nam',name:'Jan F',      age:30,role:'BOWL',bat:12,bowl:70,field:54,wk:0, ps:64, cl:40,ct:46,ci:38,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nam_08',tid:'t_nam',name:'Mauritius O',age:26,role:'BOWL',bat:12,bowl:68,field:52,wk:0, ps:62, cl:36,ct:42,ci:34,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nam_09',tid:'t_nam',name:'Michael V',  age:27,role:'BAT', bat:60,bowl:5, field:56,wk:0, ps:56, cl:34,ct:32,ci:36,cm:'Defensive'},
    {id:'p_nam_10',tid:'t_nam',name:'Pikky Y',    age:29,role:'ALL', bat:56,bowl:60,field:56,wk:0, ps:56, cl:36,ct:40,ci:34,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_nam_11',tid:'t_nam',name:'JJ S',       age:30,role:'BOWL',bat:10,bowl:66,field:52,wk:0, ps:60, cl:32,ct:38,ci:30,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nam_12',tid:'t_nam',name:'Karl B',     age:24,role:'BAT', bat:58,bowl:5, field:54,wk:0, ps:54, cl:28,ct:26,ci:30,cm:'Defensive'},
    {id:'p_nam_13',tid:'t_nam',name:'Dian P',     age:23,role:'ALL', bat:54,bowl:58,field:54,wk:0, ps:52, cl:28,ct:32,ci:26,cm:'Defensive',   bt:'Off Spin'},
    {id:'p_nam_14',tid:'t_nam',name:'Nicol L',    age:25,role:'BOWL',bat:10,bowl:62,field:50,wk:0, ps:56, cl:26,ct:32,ci:24,cm:'Defensive',   bt:'Fast Medium',sub:'Pace'},
    {id:'p_nam_15',tid:'t_nam',name:'Helao S',    age:24,role:'WK',  bat:56,bowl:0, field:52,wk:62,ps:52, cl:30,ct:28,ci:32,cm:'Defensive'},
    {id:'p_nam_16',tid:'t_nam',name:'Tangeni L',  age:22,role:'BAT', bat:58,bowl:5, field:54,wk:0, ps:54, cl:28,ct:26,ci:30,cm:'Defensive'},
  ];
 // ── Players INSERT ──────────────────────────────────────────────
  players.forEach(p => {
    const subtype    = p.sub || (
      p.role==='BAT'  ? 'Top Order'    :
      p.role==='WK'   ? 'Wicketkeeper' :
      p.role==='BOWL' ? (p.bowl >= 85 ? 'Pace' : 'Spin') :
      p.role==='ALL'  ? (p.bowl >= 74 ? 'Pace Allrounder' : 'Spin Allrounder') : ''
    );
    const bat_hand   = p.bh  || 'Right Hand';
    const bowl_type  = p.bt  || ((p.role==='BOWL'||p.role==='ALL') ? (p.bowl>=90?'Fast':p.bowl>=82?'Medium Fast':'Off Spin') : '');
    const bowl_hand  = p.bwh || ((p.role==='BOWL'||p.role==='ALL') ? 'Right Arm' : '');
    const bowl_phase = p.bp  || ((p.role==='BOWL'||p.role==='ALL') ? 'Middle' : '');
    const bat_pos    = p.pos || (
      p.role==='BAT' && p.bat >= 88 ? 'Opener'       :
      p.role==='BAT' && p.bat >= 80 ? 'Middle Order' :
      p.role==='BAT'                ? 'Middle Order' :
      p.role==='WK'                 ? 'Wicketkeeper' :
      p.role==='ALL'                ? 'Lower Middle' :
                                      'Lower Order'
    );
    const ps = p.ps || Math.round(
      p.role==='BAT'  ? (p.bat*0.70 + p.field*0.20 + p.bowl*0.10) :
      p.role==='BOWL' ? (p.bowl*0.70 + p.field*0.20 + p.bat*0.10) :
      p.role==='ALL'  ? (p.bat*0.45 + p.bowl*0.45 + p.field*0.10) :
      p.role==='WK'   ? (p.bat*0.50 + p.wk*0.30   + p.field*0.20) : 50
    );

    // Captain fields — use explicit p.cl/ct/ci/cm if set, else auto-derive
    const captain_leadership = p.cl || Math.round(
      ps >= 90 ? 75 + (ps-90)*1.5 :
      ps >= 80 ? 60 + (ps-80)*1.5 :
      ps >= 70 ? 45 + (ps-70)*1.5 :
      ps >= 60 ? 30 + (ps-60)*1.5 :
                 15 + ps*0.25
    );
    const captain_tactics = p.ct || Math.round(
      p.role==='ALL'  ? captain_leadership*0.95 :
      p.role==='BOWL' ? captain_leadership*1.05 :
      p.role==='BAT'  ? captain_leadership*0.90 :
      p.role==='WK'   ? captain_leadership*0.92 :
                        captain_leadership*0.90
    );
    const captain_influence = p.ci || Math.round(
      p.role==='ALL' ? captain_leadership*0.98 :
      p.role==='BAT' ? captain_leadership*1.02 :
      p.role==='WK'  ? captain_leadership*0.95 :
                       captain_leadership*0.88
    );
    const captain_mode = p.cm || (
      captain_leadership >= 85 ? 'Inspirational' :
      captain_leadership >= 75 ? 'Aggressive'    :
      captain_leadership >= 65 ? 'Experienced'   :
      captain_leadership >= 55 ? 'Tactical'      :
      captain_leadership >= 45 ? 'Defensive'     :
                                 'Impulsive'
    );

    dbRun(
      `INSERT OR IGNORE INTO Players(
         id,team_id,name,age,role,subtype,bat_rating,bowl_rating,field_rating,wk_rating,
         power_score,bat_hand,bowl_type,bowl_hand,bowl_phase,bat_position,
         captain_leadership,captain_tactics,captain_influence,captain_mode
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.id, p.tid, p.name, p.age, p.role, subtype,
        p.bat, p.bowl, p.field, p.wk,
        ps, bat_hand, bowl_type, bowl_hand, bowl_phase, bat_pos,
        captain_leadership, captain_tactics, captain_influence, captain_mode
      ]
    );
  });

} // end loadSeedData