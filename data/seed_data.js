function loadSeedData() {
  const teams = [
    {id:'t_ind',name:'India',       country:'India',       flag:'🇮🇳'},
    {id:'t_aus',name:'Australia',   country:'Australia',   flag:'🇦🇺'},
    {id:'t_eng',name:'England',     country:'England',     flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},
    {id:'t_pak',name:'Pakistan',    country:'Pakistan',    flag:'🇵🇰'},
    {id:'t_sa', name:'South Africa',country:'S. Africa',   flag:'🇿🇦'},
    {id:'t_nz', name:'New Zealand', country:'New Zealand', flag:'🇳🇿'},
    {id:'t_wi', name:'West Indies', country:'W. Indies',   flag:'🏏'},
    {id:'t_sl', name:'Sri Lanka',   country:'Sri Lanka',   flag:'🇱🇰'},
    {id:'t_ban',name:'Bangladesh',  country:'Bangladesh',  flag:'🇧🇩'},
    {id:'t_afg',name:'Afghanistan', country:'Afghanistan', flag:'🇦🇫'},
    {id:'t_zim',name:'Zimbabwe',    country:'Zimbabwe',    flag:'🇿🇼'},
    {id:'t_ire',name:'Ireland',     country:'Ireland',     flag:'🇮🇪'},
    {id:'t_sco',name:'Scotland',    country:'Scotland',    flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
    {id:'t_ned',name:'Netherlands', country:'Netherlands', flag:'🇳🇱'},
    {id:'t_uae',name:'UAE',         country:'UAE',         flag:'🇦🇪'},
    {id:'t_nep',name:'Nepal',       country:'Nepal',       flag:'🇳🇵'},
    {id:'t_usa',name:'USA',         country:'USA',         flag:'🇺🇸'},
    {id:'t_can',name:'Canada',      country:'Canada',      flag:'🇨🇦'},
    {id:'t_png',name:'Papua NG',    country:'PNG',         flag:'🇵🇬'},
    {id:'t_nam',name:'Namibia',     country:'Namibia',     flag:'🇳🇦'},
  ];

  teams.forEach(t => dbRun(
    `INSERT OR IGNORE INTO Teams(id,name,country,type,division,gt_tier,balance,fanbase,reputation)
     VALUES(?,?,?,'international',0,0,5000000,500000,60)`,
    [t.id, t.name, t.country]
  ));

  const venues = [
    {id:'v1', name:'Wankhede Stadium',     country:'India',       capacity:33000,  pitch:'Flat'},
    {id:'v2', name:'Eden Gardens',         country:'India',       capacity:66000,  pitch:'Good'},
    {id:'v3', name:'Arun Jaitley Stadium', country:'India',       capacity:40000,  pitch:'Flat'},
    {id:'v4', name:'MCG',                  country:'Australia',   capacity:100000, pitch:'Good'},
    {id:'v5', name:'SCG',                  country:'Australia',   capacity:48000,  pitch:'Deteriorating'},
    {id:'v6', name:'Lords',                country:'England',     capacity:30000,  pitch:'Deteriorating'},
    {id:'v7', name:'The Oval',             country:'England',     capacity:25000,  pitch:'Good'},
    {id:'v8', name:'Gaddafi Stadium',      country:'Pakistan',    capacity:27000,  pitch:'Rank Turner'},
    {id:'v9', name:'Newlands',             country:'S. Africa',   capacity:25000,  pitch:'Good'},
    {id:'v10',name:'Eden Park',            country:'New Zealand', capacity:50000,  pitch:'Good'},
    {id:'v11',name:'Kensington Oval',      country:'W. Indies',   capacity:28000,  pitch:'Flat'},
    {id:'v12',name:'Pallekele',            country:'Sri Lanka',   capacity:35000,  pitch:'Rank Turner'},
    {id:'v13',name:'Mirpur',               country:'Bangladesh',  capacity:26000,  pitch:'Rank Turner'},
    {id:'v14',name:'Sharjah',              country:'UAE',         capacity:16000,  pitch:'Flat'},
    {id:'v15',name:'Harare Sports Club',   country:'Zimbabwe',    capacity:10000,  pitch:'Deteriorating'},
  ];

  venues.forEach(v => dbRun(
    `INSERT OR IGNORE INTO Venues(id,name,country,capacity,pitch_type) VALUES(?,?,?,?,?)`,
    [v.id, v.name, v.country, v.capacity, v.pitch]
  ));

  const presets = [
    {id:'fp1',name:'Balanced',             p_dot_mod:0.00, boundary_mod:0.00},
    {id:'fp2',name:'Attacking Slip Cordon',p_dot_mod:0.04, boundary_mod:-0.02},
    {id:'fp3',name:'Standard Covers',      p_dot_mod:0.02, boundary_mod:-0.01},
    {id:'fp4',name:'Defensive Ring',       p_dot_mod:-0.04,boundary_mod:0.04},
    {id:'fp5',name:'Leg-side Trap',        p_dot_mod:0.02, boundary_mod:0.00},
  ];

  presets.forEach(fp => dbRun(
    `INSERT OR IGNORE INTO FieldPresets(id,team_id,name,p_dot_mod,boundary_mod) VALUES(?,NULL,?,?,?)`,
    [fp.id, fp.name, fp.p_dot_mod, fp.boundary_mod]
  ));

  console.log('Seed data: 20 teams, 15 venues, 5 field presets loaded.');
}