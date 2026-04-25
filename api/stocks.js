// KR Stock Predictor Backend v1
import iconv from 'iconv-lite';
// 코스피200 전체 종목 분석 — 기관 관점 국내 주식 추천
// 점수 체계: 기관매수 10개×10점(100점→45% = 45점 반영)
//            차트분석 10개×10점(100점→40% = 40점 반영)
//            뉴스분석 10기사×10점(100점→15% = 15점 반영)
// 총점 = 기관(0~45) + 차트(0~40) + 뉴스(0~15) = 0~100점
//
// Yahoo Finance 티커: {종목코드}.KS (코스피)
// 벤치마크: ^KS200 (코스피200 지수)
// 장 시간: KST 09:00~15:30 (정규장), KST 08:00~09:00 (프리마켓), KST 15:30~18:00 (에프터마켓)

// ─── 코스피200 전체 종목 위험도 분류 ─────────────────────────────────────────
// 위험도 기준:
//   매우안전: 시총 상위 대형 방어주 (금융, 통신, 필수소비재, 유틸리티)
//   안전:     대형 우량주 (자동차, 반도체 대형, 건설, 화학 대형)
//   보통:     중대형 성장주 (IT, 바이오 대형, 산업재)
//   위험:     중소형 성장주, 사이클 산업 (2차전지, 조선, 항공)
//   매우위험: 소형 성장주, 고변동성 (게임, 바이오 소형, 테마주)

const STOCKS = [
  // ── 매우 안전 (40개) ─────────────────────────────────────────────────────
  { ticker:"005930.KS", name:"삼성전자",           risk:"very_safe", sector:["삼성전자", "삼성전자주식", "삼성전자주가"] },
  { ticker:"000660.KS", name:"SK하이닉스",          risk:"very_safe", sector:["SK하이닉스", "SK하이닉스주가", "HBM"] },
  { ticker:"005380.KS", name:"현대차",              risk:"very_safe", sector:["자동차", "현대차", "전기차", "수소차"] },
  { ticker:"000270.KS", name:"기아",                risk:"very_safe", sector:["자동차", "기아", "전기차"] },
  { ticker:"105560.KS", name:"KB금융",              risk:"very_safe", sector:["금융", "은행", "KB금융", "금리"] },
  { ticker:"055550.KS", name:"신한지주",            risk:"very_safe", sector:["금융", "은행", "신한", "금리"] },
  { ticker:"086790.KS", name:"하나금융지주",        risk:"very_safe", sector:["금융", "은행", "하나", "금리"] },
  { ticker:"316140.KS", name:"우리금융지주",        risk:"very_safe", sector:["금융", "은행", "우리", "금리"] },
  { ticker:"033780.KS", name:"KT&G",               risk:"very_safe", sector:["담배", "KT&G"] },
  { ticker:"030200.KS", name:"KT",                 risk:"very_safe", sector:["통신", "5G", "KT", "인터넷", "IPTV"] },
  { ticker:"017670.KS", name:"SK텔레콤",           risk:"very_safe", sector:["통신", "5G", "SK텔레콤", "인터넷"] },
  { ticker:"032640.KS", name:"LG유플러스",          risk:"very_safe", sector:["통신", "5G", "LG유플러스", "인터넷"] },
  { ticker:"015760.KS", name:"한국전력",            risk:"very_safe", sector:["전력", "한국전력", "에너지"] },
  { ticker:"036460.KS", name:"한국가스공사",        risk:"very_safe", sector:["가스", "한국가스공사", "에너지"] },
  { ticker:"000810.KS", name:"삼성화재",            risk:"very_safe", sector:["보험", "금융", "삼성화재"] },
  { ticker:"001450.KS", name:"현대해상",            risk:"very_safe", sector:["보험", "금융", "현대해상"] },
  { ticker:"005830.KS", name:"DB손해보험",          risk:"very_safe", sector:["보험", "금융", "DB손해보험"] },
  { ticker:"088350.KS", name:"한화생명",            risk:"very_safe", sector:["보험", "금융", "한화생명"] },
  { ticker:"032830.KS", name:"삼성생명",            risk:"very_safe", sector:["보험", "금융", "삼성생명"] },
  { ticker:"138040.KS", name:"메리츠금융지주",      risk:"very_safe", sector:["금융", "보험", "메리츠"] },
  { ticker:"004370.KS", name:"농심",               risk:"very_safe", sector:["식품", "라면", "농심"] },
  { ticker:"007310.KS", name:"오뚜기",              risk:"very_safe", sector:["식품", "오뚜기"] },
  { ticker:"271560.KS", name:"오리온",              risk:"very_safe", sector:["식품", "과자", "오리온"] },
  { ticker:"003230.KS", name:"삼양식품",            risk:"very_safe", sector:["식품", "라면", "삼양식품"] },
  { ticker:"000080.KS", name:"하이트진로",          risk:"very_safe", sector:["주류", "맥주", "하이트진로"] },
  { ticker:"097950.KS", name:"CJ제일제당",          risk:"very_safe", sector:["식품", "CJ제일제당"] },
  { ticker:"001680.KS", name:"대상",               risk:"very_safe", sector:["식품", "대상"] },
  { ticker:"026960.KS", name:"동서",               risk:"very_safe", sector:["식품", "커피", "동서"] },
  { ticker:"280360.KS", name:"롯데웰푸드",          risk:"very_safe", sector:["식품", "롯데웰푸드"] },
  { ticker:"005300.KS", name:"롯데칠성",            risk:"very_safe", sector:["음료", "롯데칠성"] },
  { ticker:"139480.KS", name:"이마트",              risk:"very_safe", sector:["유통", "이마트", "마트"] },
  { ticker:"004170.KS", name:"신세계",              risk:"very_safe", sector:["유통", "신세계", "백화점"] },
  { ticker:"071320.KS", name:"한국지역난방공사",    risk:"very_safe", sector:["지역난방", "에너지"] },
  { ticker:"024110.KS", name:"기업은행",            risk:"very_safe", sector:["금융", "은행", "기업은행"] },
  { ticker:"138930.KS", name:"BNK금융지주",         risk:"very_safe", sector:["금융", "은행", "BNK"] },
  { ticker:"175330.KS", name:"JB금융지주",          risk:"very_safe", sector:["금융", "은행", "JB"] },
  { ticker:"039490.KS", name:"키움증권",            risk:"very_safe", sector:["증권", "금융", "키움"] },
  { ticker:"071050.KS", name:"한국금융지주",        risk:"very_safe", sector:["증권", "금융"] },
  { ticker:"006800.KS", name:"미래에셋증권",        risk:"very_safe", sector:["증권", "금융", "미래에셋"] },
  { ticker:"005940.KS", name:"NH투자증권",          risk:"very_safe", sector:["증권", "금융", "NH"] },

  // ── 안전 (40개) ──────────────────────────────────────────────────────────
  { ticker:"005490.KS", name:"POSCO홀딩스",         risk:"safe", sector:["철강", "포스코", "2차전지소재"] },
  { ticker:"012330.KS", name:"현대모비스",          risk:"safe", sector:["자동차부품", "현대모비스"] },
  { ticker:"051910.KS", name:"LG화학",              risk:"safe", sector:["화학", "LG화학", "2차전지소재"] },
  { ticker:"003550.KS", name:"LG",                 risk:"safe", sector:["지주", "LG"] },
  { ticker:"066570.KS", name:"LG전자",              risk:"safe" },
  { ticker:"034730.KS", name:"SK",                 risk:"safe", sector:["지주", "SK"] },
  { ticker:"096770.KS", name:"SK이노베이션",        risk:"safe", sector:["정유", "화학", "SK이노베이션"] },
  { ticker:"009150.KS", name:"삼성전기",            risk:"safe", sector:["반도체", "전자부품", "MLCC"] },
  { ticker:"018260.KS", name:"삼성SDS",             risk:"safe", sector:["IT서비스", "클라우드", "삼성SDS"] },
  { ticker:"028260.KS", name:"삼성물산",            risk:"safe", sector:["건설", "삼성물산", "패션"] },
  { ticker:"010140.KS", name:"삼성중공업",          risk:"safe" },
  { ticker:"047810.KS", name:"한국항공우주",        risk:"safe", sector:["방산", "항공우주", "한국항공우주", "KAI"] },
  { ticker:"012450.KS", name:"한화에어로스페이스",  risk:"safe", sector:["방산", "항공우주", "한화에어로스페이스"] },
  { ticker:"272210.KS", name:"한화시스템",          risk:"safe", sector:["방산", "IT", "한화시스템"] },
  { ticker:"079550.KS", name:"LIG넥스원",           risk:"safe", sector:["방산", "미사일", "LIG넥스원"] },
  { ticker:"000720.KS", name:"현대건설",            risk:"safe", sector:["건설", "현대건설", "아파트", "재건축"] },
  { ticker:"047040.KS", name:"대우건설",            risk:"safe", sector:["건설", "대우건설", "아파트"] },
  { ticker:"375500.KS", name:"DL이앤씨",            risk:"safe", sector:["건설", "DL이앤씨", "아파트"] },
  { ticker:"006360.KS", name:"GS건설",              risk:"safe", sector:["건설", "GS건설", "아파트"] },
  { ticker:"028050.KS", name:"삼성E&A",             risk:"safe", sector:["건설", "플랜트", "삼성E&A"] },
  { ticker:"010130.KS", name:"고려아연",            risk:"safe", sector:["비철금속", "아연", "고려아연"] },
  { ticker:"004020.KS", name:"현대제철",            risk:"safe", sector:["철강", "현대제철"] },
  { ticker:"002030.KS", name:"아시아나항공",        risk:"safe", sector:["항공", "아시아나항공", "여행"] },  // Asia Holdings
  { ticker:"011200.KS", name:"HMM",                risk:"safe", sector:["해운", "HMM", "컨테이너"] },
  { ticker:"003490.KS", name:"대한항공",            risk:"safe", sector:["항공", "대한항공", "여행"] },
  { ticker:"086280.KS", name:"현대글로비스",        risk:"safe", sector:["물류", "현대글로비스", "자동차"] },
  { ticker:"000120.KS", name:"CJ대한통운",          risk:"safe", sector:["물류", "택배", "CJ대한통운"] },
  { ticker:"028670.KS", name:"팬오션",              risk:"safe", sector:["해운", "벌크선", "팬오션"] },
  { ticker:"078930.KS", name:"GS",                 risk:"safe", sector:["지주", "GS", "정유"] },
  { ticker:"009830.KS", name:"한화솔루션",          risk:"safe", sector:["태양광", "화학", "한화솔루션"] },
  { ticker:"267250.KS", name:"HD현대",              risk:"safe", sector:["조선", "HD현대"] },
  { ticker:"009540.KS", name:"HD한국조선해양",      risk:"safe", sector:["조선", "HD한국조선해양", "LNG선"] },
  { ticker:"329180.KS", name:"HD현대중공업",        risk:"safe", sector:["조선", "HD현대중공업", "LNG선"] },
  { ticker:"042660.KS", name:"한화오션",            risk:"safe", sector:["조선", "한화오션", "LNG선"] },
  { ticker:"034020.KS", name:"두산에너빌리티",      risk:"safe", sector:["원전", "두산에너빌리티", "에너지"] },
  { ticker:"000150.KS", name:"두산",               risk:"safe", sector:["지주", "두산"] },
  { ticker:"241560.KS", name:"두산밥캣",            risk:"safe", sector:["건설기계", "두산밥캣"] },
  { ticker:"006260.KS", name:"LS",                 risk:"safe", sector:["지주", "LS", "전선"] },
  { ticker:"010120.KS", name:"LS ELECTRIC",        risk:"safe", sector:["전력기기", "LS ELECTRIC", "변압기"] },
  { ticker:"001040.KS", name:"CJ",                 risk:"safe", sector:["지주", "CJ"] },

  // ── 보통 (40개) ──────────────────────────────────────────────────────────
  { ticker:"035420.KS", name:"NAVER",              risk:"moderate", sector:["네이버", "검색", "플랫폼", "AI", "웹툰", "클라우드"] },
  { ticker:"035720.KS", name:"카카오",              risk:"moderate", sector:["카카오", "플랫폼", "메신저", "카카오톡", "AI"] },
  { ticker:"259960.KS", name:"크래프톤",            risk:"moderate", sector:["게임", "크래프톤", "배틀그라운드"] },
  { ticker:"352820.KS", name:"하이브",              risk:"moderate", sector:["엔터", "K팝", "하이브", "BTS"] },
  { ticker:"035250.KS", name:"강원랜드",            risk:"moderate", sector:["카지노", "강원랜드"] },
  { ticker:"114090.KS", name:"GKL",                risk:"moderate", sector:["카지노", "GKL"] },
  { ticker:"034230.KS", name:"파라다이스",          risk:"moderate", sector:["카지노", "파라다이스"] },
  { ticker:"008770.KS", name:"호텔신라",            risk:"moderate", sector:["호텔", "면세점", "호텔신라"] },
  { ticker:"069960.KS", name:"현대백화점",          risk:"moderate", sector:["유통", "현대백화점"] },
  { ticker:"023530.KS", name:"롯데쇼핑",            risk:"moderate", sector:["유통", "롯데쇼핑", "마트"] },
  { ticker:"068270.KS", name:"셀트리온",            risk:"moderate", sector:["바이오", "셀트리온", "항체"] },
  { ticker:"207940.KS", name:"삼성바이오로직스",    risk:"moderate", sector:["바이오", "CMO", "삼성바이오로직스"] },
  { ticker:"006280.KS", name:"녹십자",              risk:"moderate", sector:["제약", "혈액제제", "녹십자"] },
  { ticker:"128940.KS", name:"한미약품",            risk:"moderate", sector:["제약", "한미약품", "신약"] },
  { ticker:"069620.KS", name:"대웅제약",            risk:"moderate", sector:["제약", "대웅제약"] },
  { ticker:"185750.KS", name:"종근당",              risk:"moderate", sector:["제약", "종근당"] },
  { ticker:"000100.KS", name:"유한양행",            risk:"moderate", sector:["제약", "유한양행", "신약"] },
  { ticker:"090430.KS", name:"아모레퍼시픽",        risk:"moderate", sector:["화장품", "뷰티", "아모레퍼시픽", "K뷰티"] },
  { ticker:"051900.KS", name:"LG생활건강",          risk:"moderate", sector:["화장품", "뷰티", "LG생활건강", "K뷰티"] },
  { ticker:"161890.KS", name:"콜마코리아",          risk:"moderate", sector:["화장품", "ODM", "콜마"] },
  { ticker:"192820.KS", name:"코스맥스",            risk:"moderate", sector:["화장품", "ODM", "코스맥스"] },
  { ticker:"011070.KS", name:"LG이노텍",            risk:"moderate", sector:["전자부품", "카메라모듈", "LG이노텍"] },
  { ticker:"034220.KS", name:"LG디스플레이",        risk:"moderate", sector:["디스플레이", "OLED", "LG디스플레이"] },
  { ticker:"064400.KS", name:"LG CNS",             risk:"moderate", sector:["IT서비스", "클라우드", "LG CNS"] },
  { ticker:"307950.KS", name:"현대오토에버",        risk:"moderate", sector:["IT서비스", "자동차SW", "현대오토에버"] },
  { ticker:"022100.KS", name:"포스코DX",            risk:"moderate", sector:["IT서비스", "포스코DX"] },
  { ticker:"047050.KS", name:"포스코인터내셔널",    risk:"moderate", sector:["무역", "포스코인터내셔널", "LNG"] },
  { ticker:"003670.KS", name:"포스코퓨처엠",        risk:"moderate", sector:["2차전지", "양극재", "포스코퓨처엠"] },
  { ticker:"011780.KS", name:"금호석유화학",        risk:"moderate", sector:["화학", "합성고무"] },
  { ticker:"120110.KS", name:"코오롱인더",          risk:"moderate", sector:["화학", "섬유", "코오롱"] },
  { ticker:"005420.KS", name:"코스모화학",          risk:"moderate", sector:["화학", "이산화티탄"] },
  { ticker:"014680.KS", name:"한솔케미칼",          risk:"moderate", sector:["화학", "반도체소재"] },
  { ticker:"298050.KS", name:"효성첨단소재",        risk:"moderate", sector:["소재", "탄소섬유", "효성첨단소재"] },
  { ticker:"298020.KS", name:"효성TNC",             risk:"moderate", sector:["섬유", "나일론", "효성TNC"] },
  { ticker:"282330.KS", name:"BGF리테일",           risk:"moderate", sector:["편의점", "CU", "BGF리테일"] },
  { ticker:"021240.KS", name:"코웨이",              risk:"moderate", sector:["가전", "렌탈", "코웨이", "정수기"] },
  { ticker:"009240.KS", name:"한샘",               risk:"moderate", sector:["가구", "인테리어", "한샘"] },
  { ticker:"204320.KS", name:"HL만도",              risk:"moderate", sector:["자동차부품", "HL만도", "전장"] },
  { ticker:"161390.KS", name:"한국타이어앤테크놀로지", risk:"moderate", sector:["타이어", "자동차부품"] },
  { ticker:"018880.KS", name:"한온시스템",          risk:"moderate", sector:["자동차부품", "한온시스템", "전장"] },

  // ── 위험 (40개) ──────────────────────────────────────────────────────────
  { ticker:"373220.KS", name:"LG에너지솔루션",      risk:"risky", sector:["2차전지", "배터리", "전기차", "LG에너지솔루션"] },
  { ticker:"006400.KS", name:"삼성SDI",             risk:"risky", sector:["2차전지", "배터리", "삼성SDI"] },
  { ticker:"402340.KS", name:"SK스퀘어",            risk:"risky", sector:["지주", "SK스퀘어", "반도체"] },
  { ticker:"361610.KS", name:"SK아이이테크놀로지",  risk:"risky", sector:["2차전지", "분리막", "SK아이이테크놀로지"] },
  { ticker:"285130.KS", name:"SK케미칼",            risk:"risky", sector:["화학", "SK케미칼", "바이오"] },
  { ticker:"011790.KS", name:"SKC",                risk:"risky", sector:["화학", "SKC", "동박"] },
  { ticker:"267260.KS", name:"HD현대일렉트릭",      risk:"risky", sector:["전력기기", "HD현대일렉트릭", "변압기"] },
  { ticker:"071970.KS", name:"HD현대마린엔진",      risk:"risky", sector:["조선", "엔진", "HD현대마린엔진"] },
  { ticker:"443060.KS", name:"HD현대마린솔루션",    risk:"risky", sector:["조선", "서비스", "HD현대마린솔루션"] },
  { ticker:"298040.KS", name:"효성중공업",          risk:"risky", sector:["전력기기", "효성중공업", "변압기"] },
  { ticker:"082740.KS", name:"한화엔진",            risk:"risky", sector:["조선", "엔진", "한화엔진"] },
  { ticker:"017800.KS", name:"현대엘리베이터",      risk:"risky", sector:["엘리베이터", "현대엘리베이터"] },
  { ticker:"064350.KS", name:"현대로템",            risk:"risky", sector:["방산", "현대로템", "K2전차"] },
  { ticker:"011210.KS", name:"현대위아",            risk:"risky", sector:["자동차부품", "현대위아"] },
  { ticker:"007340.KS", name:"DN오토모티브",        risk:"risky" },
  { ticker:"042700.KS", name:"한미반도체",          risk:"risky", sector:["반도체", "HBM", "본딩"] },
  { ticker:"007660.KS", name:"이수페타시스",        risk:"risky", sector:["반도체", "PCB", "기판"] },
  { ticker:"457190.KS", name:"이수스페셜티케미컬",  risk:"risky" },
  { ticker:"112610.KS", name:"씨에스윈드",          risk:"risky", sector:["풍력", "씨에스윈드", "신재생에너지"] },
  { ticker:"066970.KS", name:"엘앤에프",            risk:"risky", sector:["2차전지", "양극재", "엘앤에프"] },
  { ticker:"450080.KS", name:"에코프로머티리얼즈",  risk:"risky", sector:["2차전지", "소재", "에코프로"] },
  { ticker:"103140.KS", name:"풍산",               risk:"risky", sector:["비철금속", "동", "풍산"] },
  { ticker:"001430.KS", name:"세아베스틸지주",      risk:"risky", sector:["철강", "특수강"] },
  { ticker:"003030.KS", name:"세아홀딩스",          risk:"risky", sector:["철강", "특수강"] },
  { ticker:"000670.KS", name:"영풍",               risk:"risky", sector:["비철금속", "아연", "영풍"] },
  { ticker:"010060.KS", name:"OCI홀딩스",           risk:"risky", sector:["태양광", "OCI", "화학"] },
  { ticker:"006650.KS", name:"한국화학",            risk:"risky", sector:["화학"] },
  { ticker:"093370.KS", name:"후성",               risk:"risky", sector:["화학", "불소"] },
  { ticker:"268280.KS", name:"미원특수화학",        risk:"risky", sector:["화학", "계면활성제"] },
  { ticker:"002840.KS", name:"미원상사",            risk:"risky", sector:["화학", "계면활성제"] },
  { ticker:"004000.KS", name:"롯데정밀화학",        risk:"risky", sector:["화학", "롯데정밀화학"] },
  { ticker:"011170.KS", name:"롯데케미칼",          risk:"risky", sector:["화학", "롯데케미칼"] },
  { ticker:"073240.KS", name:"금호타이어",          risk:"risky", sector:["타이어", "자동차부품"] },
  { ticker:"180640.KS", name:"한진칼",              risk:"risky", sector:["항공", "한진칼", "대한항공"] },
  { ticker:"002790.KS", name:"아모레퍼시픽그룹",    risk:"risky", sector:["화장품", "뷰티", "아모레퍼시픽"] },
  { ticker:"278470.KS", name:"APR",                risk:"risky", sector:["화장품", "뷰티", "APR"] },
  { ticker:"383220.KS", name:"F&F",                risk:"risky", sector:["패션", "F&F", "MLB"] },
  { ticker:"001800.KS", name:"오리온홀딩스",        risk:"risky", sector:["식품", "오리온홀딩스"] },
  { ticker:"004990.KS", name:"롯데지주",            risk:"risky", sector:["지주", "롯데"] },
  { ticker:"139130.KS", name:"DGB금융지주",         risk:"risky", sector:["금융", "은행", "DGB"] },

  // ── 매우 위험 (40개) ─────────────────────────────────────────────────────
  { ticker:"454910.KS", name:"두산로보틱스",        risk:"very_risky", sector:["로봇", "두산로보틱스"] },
  { ticker:"326030.KS", name:"SK바이오팜",          risk:"very_risky", sector:["바이오", "뇌전증", "SK바이오팜"] },
  { ticker:"302440.KS", name:"SK바이오사이언스",    risk:"very_risky", sector:["백신", "바이오", "SK바이오사이언스"] },
  { ticker:"137310.KS", name:"SD바이오센서",        risk:"very_risky", sector:["진단", "바이오", "SD바이오센서"] },
  { ticker:"009420.KS", name:"한올바이오파마",      risk:"very_risky", sector:["바이오", "한올바이오파마"] },
  { ticker:"003090.KS", name:"대웅",               risk:"very_risky", sector:["제약", "대웅"] },
  { ticker:"008930.KS", name:"한미사이언스",        risk:"very_risky", sector:["제약", "한미사이언스", "한미약품"] },
  { ticker:"005250.KS", name:"녹십자홀딩스",        risk:"very_risky", sector:["제약", "녹십자홀딩스"] },
  { ticker:"192080.KS", name:"더블유게임즈",        risk:"very_risky", sector:["게임", "더블유게임즈"] },
  { ticker:"036570.KS", name:"엔씨소프트",          risk:"very_risky", sector:["게임", "엔씨소프트", "리니지"] },
  { ticker:"251270.KS", name:"넷마블",              risk:"very_risky", sector:["게임", "넷마블"] },
  { ticker:"377300.KS", name:"카카오페이",          risk:"very_risky", sector:["카카오페이", "핀테크", "결제", "카카오"] },
  { ticker:"323410.KS", name:"카카오뱅크",          risk:"very_risky", sector:["카카오뱅크", "인터넷은행", "카카오"] },
  { ticker:"030000.KS", name:"제일기획",            risk:"very_risky", sector:["광고", "마케팅", "제일기획"] },
  { ticker:"000210.KS", name:"DL",                 risk:"very_risky", sector:["지주", "DL", "건설"] },
  { ticker:"300720.KS", name:"한일시멘트",          risk:"very_risky", sector:["시멘트", "건설"] },
  { ticker:"002380.KS", name:"KCC",                risk:"very_risky", sector:["건자재", "KCC", "실리콘"] },
  { ticker:"052690.KS", name:"한전KPS",             risk:"very_risky", sector:["전력", "한전KPS"] },
  { ticker:"051600.KS", name:"한전기술",            risk:"very_risky", sector:["전력", "원전", "한전기술"] },
  { ticker:"081660.KS", name:"미스토",              risk:"very_risky", sector:["의류", "미스토"] },
  { ticker:"017960.KS", name:"한국카본",            risk:"very_risky", sector:["소재", "탄소섬유", "한국카본"] },
  { ticker:"014820.KS", name:"동원시스템즈",        risk:"very_risky", sector:["포장재", "동원시스템즈"] },
  { ticker:"006040.KS", name:"동원산업",            risk:"very_risky", sector:["수산", "동원산업"] },
  { ticker:"001040.KS", name:"CJ",                 risk:"very_risky", sector:["지주", "CJ"] },
  { ticker:"004490.KS", name:"세방전지",            risk:"very_risky", sector:["2차전지", "배터리", "세방전지"] },
  { ticker:"069260.KS", name:"TKG휴켐스",           risk:"very_risky", sector:["화학", "질산", "TKG휴켐스"] },
  { ticker:"008730.KS", name:"율촌화학",            risk:"very_risky", sector:["화학", "포장재"] },
  { ticker:"001440.KS", name:"태한케이블",          risk:"very_risky", sector:["전선", "태한케이블"] },
  { ticker:"003240.KS", name:"태광산업",            risk:"very_risky", sector:["섬유", "태광산업"] },
  { ticker:"111770.KS", name:"영원무역",            risk:"very_risky", sector:["의류", "OEM", "영원무역"] },
  { ticker:"009970.KS", name:"영원무역홀딩스",      risk:"very_risky", sector:["의류", "OEM", "영원무역홀딩스"] },
  { ticker:"005850.KS", name:"SL",                 risk:"very_risky", sector:["자동차부품", "SL"] },
  { ticker:"000240.KS", name:"한국앤컴퍼니",        risk:"very_risky", sector:["자동차부품", "한국앤컴퍼니", "타이어"] },
  { ticker:"012750.KS", name:"S-1",                risk:"very_risky", sector:["보안", "S-1"] },
  { ticker:"062040.KS", name:"사닐전기",            risk:"very_risky", sector:["전기", "사닐전기"] },
  { ticker:"010950.KS", name:"S-Oil",              risk:"very_risky", sector:["정유", "S-Oil"] },
  { ticker:"016360.KS", name:"삼성증권",            risk:"very_risky", sector:["증권", "금융", "삼성증권"] },
  { ticker:"029780.KS", name:"삼성카드",            risk:"very_risky", sector:["카드", "금융", "삼성카드"] },
  { ticker:"004800.KS", name:"효성",               risk:"very_risky", sector:["지주", "효성", "섬유"] },
  { ticker:"000880.KS", name:"한화",               risk:"very_risky", sector:["지주", "한화"] },
];

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://finance.yahoo.com/",
};

async function fetchWithTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function ema(arr, period) {
  if (!arr || arr.length < period) return arr?.[arr.length - 1] ?? 0;
  const k = 2 / (period + 1);
  let val = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < arr.length; i++) val = arr[i] * k + val * (1 - k);
  return val;
}

function rsi(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  const gains = [], losses = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains.push(d); else losses.push(Math.abs(d));
  }
  const ag = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const al = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
}

// ─── 한국 증시 공휴일 목록 ───────────────────────────────────────────────────
const KR_HOLIDAYS = new Set([
  '2025-01-01','2025-01-27','2025-01-28','2025-01-29','2025-01-30',
  '2025-03-01','2025-05-05','2025-05-06','2025-06-06','2025-08-15',
  '2025-10-03','2025-10-06','2025-10-07','2025-10-08','2025-10-09',
  '2025-12-25','2025-12-31',
  '2026-01-01','2026-01-27','2026-01-28','2026-01-29',
  '2026-03-01','2026-03-02','2026-05-05','2026-05-25','2026-06-06',
  '2026-08-15','2026-08-17','2026-09-24','2026-09-25','2026-09-26',
  '2026-10-03','2026-10-05','2026-10-09','2026-12-25','2026-12-31',
]);

function getKstDate() {
  const kstStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
  return new Date(kstStr);
}

// 휴장 여부 (주말 + 공휴일)
function isKrHoliday() {
  const kst = getKstDate();
  const dow = kst.getDay();
  if (dow === 0 || dow === 6) return true;
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  return KR_HOLIDAYS.has(`${y}-${m}-${d}`);
}

// 거래 시간대 여부 (프리마켓 08:00 ~ 에프터마켓 18:00)
function isMarketHours() {
  if (isKrHoliday()) return false;
  const kst = getKstDate();
  const minOfDay = kst.getHours() * 60 + kst.getMinutes();
  return minOfDay >= 480 && minOfDay < 1080; // 08:00(480) ~ 18:00(1080)
}

// 국내 정규장 여부 판단 (KST 09:00~15:30)
function isRegularSession() {
  if (isKrHoliday()) return false;
  const kst = getKstDate();
  const minOfDay = kst.getHours() * 60 + kst.getMinutes();
  return minOfDay >= 540 && minOfDay < 930; // 09:00(540) ~ 15:30(930)
}

// ─── 5분봉 당일 intraday 데이터 fetch ─────────────────────────────────────────
async function fetchIntradayData(ticker) {
  try {
    // 1분봉으로 프리마켓/에프터마켓 포함 실시간 가격 확보
    const url1m = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d&includePrePost=true`;
    const resp1m = await fetchWithTimeout(url1m, { headers: YF_HEADERS }, 8000);
    let realtimePrice = null;
    if (resp1m.ok) {
      const data1m = await resp1m.json();
      const result1m = data1m?.chart?.result?.[0];
      if (result1m) {
        const closes1m = (result1m.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
        if (closes1m.length > 0) realtimePrice = closes1m[closes1m.length - 1];
      }
    }

    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
    const resp = await fetchWithTimeout(url, { headers: YF_HEADERS }, 8000);
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const iq = result.indicators?.quote?.[0] ?? {};
    const rawCloses = iq.close  ?? [];
    const rawVols   = iq.volume ?? [];
    const rawHighs  = iq.high   ?? [];
    const rawLows   = iq.low    ?? [];

    if (!rawVols.length) return null;

    // (1) 최대 거래량 분봉 종가
    let maxVolIdx = 0, maxVol = 0;
    for (let i = 0; i < rawVols.length; i++) {
      const v = rawVols[i] ?? 0;
      if (v > maxVol) { maxVol = v; maxVolIdx = i; }
    }
    const maxVolBarClose = typeof rawCloses[maxVolIdx] === 'number' ? rawCloses[maxVolIdx] : null;

    // (2) 5분봉 누적 순매수 (상승분봉 거래량 - 하락분봉 거래량)
    let buyVol = 0, sellVol = 0;
    for (let i = 1; i < rawCloses.length; i++) {
      const c = rawCloses[i], pc = rawCloses[i-1], v = rawVols[i] ?? 0;
      if (c != null && pc != null) {
        if (c > pc) buyVol += v;
        else if (c < pc) sellVol += v;
      }
    }
    const intradayNetBuy = buyVol - sellVol;

    // (3) 최근 10분(2개 바) vs 60분(12개 바) 평균 변동폭
    function avgRange(h, l, n) {
      let sum = 0, cnt = 0;
      for (let i = Math.max(0, h.length - n); i < h.length; i++) {
        if (h[i] != null && l[i] != null) { sum += h[i] - l[i]; cnt++; }
      }
      return cnt > 0 ? sum / cnt : 0;
    }
    const range10m = avgRange(rawHighs, rawLows, 2);
    const range60m = avgRange(rawHighs, rawLows, 12);

    // (4) 체결 강도 (Volume Power) = (buyVol / sellVol) * 100
    const volumePower = sellVol > 0 ? (buyVol / sellVol) * 100 : (buyVol > 0 ? 200 : 100);

    return { maxVolBarClose, intradayNetBuy, range10m, range60m, volumePower, realtimePrice };
  } catch {
    return null;
  }
}

// ─── Yahoo Finance v8 chart API (일봉 90일) ───────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d&includePrePost=true`;
    const resp = await fetchWithTimeout(url, { headers: YF_HEADERS }, 5000);
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const q = result.indicators?.quote?.[0] ?? {};
    const closes  = (q.close  ?? []).filter(v => v != null);
    const volumes = (q.volume ?? []).filter(v => v != null);
    const opens   = (q.open   ?? []).filter(v => v != null);
    const highs   = (q.high   ?? []).filter(v => v != null);
    const lows    = (q.low    ?? []).filter(v => v != null);

    // 실시간 가격: postMarket > preMarket > regularMarket > 마지막 종가
    const postMarketPrice = meta.postMarketPrice ?? null;
    const preMarketPrice  = meta.preMarketPrice  ?? null;
    const realtimePrice   = postMarketPrice ?? preMarketPrice ?? meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const price = realtimePrice;

    // 전일 정규장 종가 (closes[-2])
    const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? price);
    const chgPct    = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const volume    = meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? 0;
    const avgVol    = volumes.length > 5
      ? volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / Math.min(19, volumes.length - 1)
      : volume;

    const ma5  = closes.length >= 5  ? closes.slice(-5).reduce((a,b)=>a+b,0)/5   : price;
    const ma10 = closes.length >= 10 ? closes.slice(-10).reduce((a,b)=>a+b,0)/10 : price;
    const ma20 = closes.length >= 20 ? closes.slice(-20).reduce((a,b)=>a+b,0)/20 : price;

    const rsiVal = rsi(closes);
    const ema12Val = ema(closes, 12);
    const ema26Val = ema(closes, 26);
    const macdLine = ema12Val - ema26Val;

    let bbUpper = price * 1.02, bbLower = price * 0.98, bbMiddle = price;
    if (closes.length >= 20) {
      const last20 = closes.slice(-20);
      bbMiddle = last20.reduce((a,b)=>a+b,0)/20;
      const variance = last20.reduce((a,b)=>a+Math.pow(b-bbMiddle,2),0)/20;
      const std = Math.sqrt(variance);
      bbUpper = bbMiddle + 2 * std;
      bbLower = bbMiddle - 2 * std;
    }

    let consecutiveUp = 0, consecutiveDown = 0;
    for (let i = closes.length - 1; i > 0 && i >= closes.length - 5; i--) {
      if (closes[i] > closes[i-1]) consecutiveUp++;
      else break;
    }
    for (let i = closes.length - 1; i > 0 && i >= closes.length - 5; i--) {
      if (closes[i] < closes[i-1]) consecutiveDown++;
      else break;
    }

    // VWAP 근사: 최근 20일 일봉 OHLCV 기반
    let vwap = price;
    if (closes.length >= 5 && highs.length >= 5 && lows.length >= 5 && volumes.length >= 5) {
      const n = Math.min(20, closes.length, highs.length, lows.length, volumes.length);
      let cumPV = 0, cumV = 0;
      for (let i = closes.length - n; i < closes.length; i++) {
        const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
        const vol = volumes[i] || 0;
        cumPV += typicalPrice * vol;
        cumV  += vol;
      }
      if (cumV > 0) vwap = cumPV / cumV;
    }

    // 변동성 (단기5일/장기20일)
    function stdDev(arr) {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
      return Math.sqrt(arr.reduce((a,b)=>a+Math.pow(b-mean,2),0)/arr.length);
    }
    const returns = closes.slice(1).map((c,i)=> closes[i]>0 ? (c-closes[i])/closes[i] : 0);
    const vol5  = stdDev(returns.slice(-5));
    const vol20 = stdDev(returns.slice(-20));

    // MFI(14)
    let mfi14 = 50;
    if (closes.length >= 15 && highs.length >= 15 && lows.length >= 15 && volumes.length >= 15) {
      const typical = closes.map((c,i)=>(highs[i]+lows[i]+c)/3);
      let pos=0, neg=0;
      for (let i=typical.length-14; i<typical.length; i++) {
        const mf = typical[i]*(volumes[i]||0);
        if (typical[i]>typical[i-1]) pos+=mf; else neg+=mf;
      }
      mfi14 = neg===0 ? 100 : 100-100/(1+pos/neg);
    }

    return {
      ticker, price, prevClose, chgPct, volume,
      avgVolume: avgVol,
      open:    meta.regularMarketOpen    ?? opens[opens.length-1]   ?? price,
      dayHigh: meta.regularMarketDayHigh ?? highs[highs.length-1]   ?? price,
      dayLow:  meta.regularMarketDayLow  ?? lows[lows.length-1]     ?? price,
      high52w: meta.fiftyTwoWeekHigh     ?? Math.max(...closes),
      low52w:  meta.fiftyTwoWeekLow      ?? Math.min(...closes),
      mktCap:  meta.marketCap            ?? 0,
      ma5, ma10, ma20, rsi: rsiVal, macdLine,
      bbUpper, bbLower, bbMiddle,
      consecutiveUp, consecutiveDown, closes, vwap,
      vol5, vol20, mfi14,
      highs, lows, volumes,
    };
  } catch {
    return null;
  }
}
// ─── Yahoo Finance 뉴스 API ────────────────────────────────────────────────────
// ─── 네이버 금융 뉴스 RSS 파싱 헬퍼 ──────────────────────────────────────────
function parseRssItems(xmlText) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
    const block = itemMatch[1];
    const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                   block.match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() ?? '';
    const link  = (block.match(/<link>([^<]*)<\/link>/) ||
                   block.match(/<originallink>([^<]*)<\/originallink>/) || [])[1]?.trim() ?? '';
    const pubDate = (block.match(/<pubDate>([^<]*)<\/pubDate>/) || [])[1]?.trim() ?? '';
    if (title) items.push({ title, url: link, pubDate });
  }
  return items;
}

async function fetchNews(ticker, stockName = '', sectorKeywords = []) {
  try {
    const code = ticker.replace('.KS', '').replace('.KQ', '');
    // 종목 관련성 필터: 종목명 키워드 (짧은 이름 추출)
    const nameTokens = stockName
      ? stockName.replace(/[()\[\]]/g, '').split(/[\s·&,]+/).filter(t => t.length >= 2)
      : [];
    // 관련성 체크: 제목에 종목명 토큰 또는 종목코드가 포함되어야 함
    // 광고성/홍보성 기사 필터 (주가 영향 없는 기사)
const PR_KEYWORDS = [
  '파트너스데이', '고객 소통', '디지털 소통', '크리에이터 조직',
  '행사 개최', '이벤트 개최', '캠페인 시작', '프로모션',
  '사회공헌', 'CSR', '봉사활동', '기부', '후원',
  '신입사원', '채용', '인턴', '공채',
  '사옥 이전', '사옥 오픈', '리뉴얼 오픈',
  '협약 체결', '업무협약', 'MOU', '파트너십 체결',
  '홈경기', '야구', '스포츠 관람', '입장권', '세금포인트',  // 스포츠 이벤트
];
// 단, 대형 계약/사업 확장은 주가 영향 있으므로 예외 처리
const PR_EXCEPTION_KEYWORDS = [
  '수주', '계약', '사업', '투자', '인수', '합병', '상장', '공모',
  '실적', '매출', '영업이익', '순이익', '목표주가', '애널리스트',
  '데이터센터', '클라우드', '반도체', '공장', '플랜트',
];
function isPRArticle(title) {
  if (!title) return false;
  const t = title;
  const hasPR = PR_KEYWORDS.some(w => t.includes(w));
  if (!hasPR) return false;
  // 예외: 대형 사업/계약 관련이면 광고성 아님
  const hasException = PR_EXCEPTION_KEYWORDS.some(w => t.includes(w));
  return !hasException;
}

// 중복 기사 제목 유사도 체크 (같은 사건 다른 언론사)
function isSimilarTitle(t1, t2) {
  if (!t1 || !t2) return false;
  // 핵심 키워드 추출 (조사/접속사 제거)
  const clean = (t) => t.replace(/[,\.\[\]\(\)'"\…·]/g, ' ').replace(/\s+/g, ' ').trim();
  const c1 = clean(t1), c2 = clean(t2);
  if (c1 === c2) return true;
  // 한쪽이 다른쪽을 80% 이상 포함하면 중복
  const words1 = c1.split(' ').filter(w => w.length > 1);
  const words2 = c2.split(' ').filter(w => w.length > 1);
  const shorter = words1.length <= words2.length ? words1 : words2;
  const longer = words1.length <= words2.length ? words2 : words1;
  if (shorter.length === 0) return false;
  const matches = shorter.filter(w => longer.includes(w)).length;
  return matches / shorter.length >= 0.6;
}

function isRelevant(title) {
      if (!title) return false;
      if (nameTokens.length === 0) return true;
      const t = title;
      // 종목코드 직접 포함
      if (t.includes(code)) return true;
      // 종목명 토큰 (영문 포함) 체크
      const meaningfulTokens = nameTokens.filter(tok => tok.length >= 3);
      if (meaningfulTokens.length > 0 && meaningfulTokens.some(token => t.includes(token))) return true;
      // 2글자 토큰은 단어 경계 체크
      const shortTokens = nameTokens.filter(tok => tok.length === 2);
      if (shortTokens.some(token => {
        const idx = t.indexOf(token);
        if (idx === -1) return false;
        const before = idx > 0 ? t[idx-1] : ' ';
        const after = idx + token.length < t.length ? t[idx + token.length] : ' ';
        return !/[가-힣a-zA-Z0-9]/.test(before) || !/[가-힣a-zA-Z0-9]/.test(after);
      })) return true;
      // 한글 이름 직접 포함 체크 (sector[0]이 한글이면 직접 관련으로 처리)
      if (sectorKeywords.length > 0) {
        const korName = sectorKeywords[0];
        if (/[가-힣]/.test(korName) && t.includes(korName)) return true;
      }
      return false;
    }
    // 네이버 금융 URL 기반 기사는 관련성 체크 없이 통과 (종목 코드가 URL에 포함됨)
    function isNaverStockNews(url) {
      return url && url.includes(`code=${code}`);
    }

    // 1차: 네이버 금융 종목 뉴스 RSS
    const naverRssUrl = `https://finance.naver.com/item/news_news.naver?code=${code}&page=1&sm=title_entity_id.basic&clusterId=`;
    // 2차: 네이버 뉴스 검색 API (종목코드 검색)
    const naverSearchUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(code)}&display=10&sort=date`;
    // 3차: 다음 금융 뉴스
    const daumUrl = `https://finance.daum.net/api/news/stocks/${code}?perPage=10&page=1`;

    const NAVER_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://finance.naver.com/',
    };

    const DAUM_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://finance.daum.net/',
      'Origin': 'https://finance.daum.net',
    };

    const [naverResp, daumResp] = await Promise.allSettled([
      fetchWithTimeout(naverRssUrl, { headers: NAVER_HEADERS }, 3000),
      fetchWithTimeout(daumUrl, { headers: DAUM_HEADERS }, 3000),
    ]);

    let allNews = [];

    // 네이버 금융 HTML 파싱
    // 실제 구조: <a href="/item/news_read.naver?..." class="tit" onClick=...>제목</a>
    // iconv-lite로 EUC-KR 디코딩 → UTF-8 변환 후 파싱
    if (naverResp.status === 'fulfilled' && naverResp.value.ok) {
      try {
        const buf = await naverResp.value.arrayBuffer();
        // iconv-lite로 EUC-KR → UTF-8 디코딩
        const html = iconv.decode(Buffer.from(buf), 'euc-kr');
        // class="title" 안의 <a href="/item/news_read.naver..."> 패턴
        // 이 패턴은 해당 종목과 직접 연관된 기사만 포함
        // 실제 네이버 구조: class="tit" 링크 추출
        const titleRegex = /<td[^>]*class="title"[^>]*>[\s\S]*?<a href="(\/item\/news_read\.naver[^"]+)"[^>]*class="tit"[^>]*>([\s\S]{5,200}?)<\/a>/gi;
        let m;
        while ((m = titleRegex.exec(html)) !== null && allNews.length < 15) {
          const url = `https://finance.naver.com${m[1]}`;
          const rawTitle = m[2].trim();
          const title = rawTitle
            .replace(/<[^>]+>/g, '')  // HTML 태그 제거
            .replace(/&quot;/g, '"').replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
            .replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&hellip;/g, '…').replace(/&middot;/g, '·').replace(/&harr;/g, '↔')
            .replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, '')
            .replace(/\s+/g, ' ').trim();
          if (title && title.length > 3) allNews.push({ title, url, fromNaver: true, naverRelevant: isRelevant(title) });
        }
      } catch (e) { /* ignore parse errors */ }
    }

    // 다음 금융 뉴스 API
    if (daumResp.status === 'fulfilled' && daumResp.value.ok) {
      try {
        const daumData = await daumResp.value.json();
        const daumItems = daumData?.data ?? daumData?.news ?? daumData?.list ?? [];
        for (const item of daumItems.slice(0, 10)) {
          const title = item.title ?? item.subject ?? '';
          const url = item.url ?? item.link ?? `https://finance.daum.net/quotes/A${code}`;
          if (title) allNews.push({ title, url });
        }
      } catch { /* ignore */ }
    }

    // 관련성 필터 + 중복 제거
    const seen = new Set();
    // 관련성 점수 부여 후 정렬
    const scored = allNews.map(n => {
      const rel = isRelevant(n.title);
      let priority = 0;
      if (rel === true || rel === 1) priority = 3;       // 종목명 직접 포함
      else if (rel === 'sector') priority = 1;           // 업종 관련
      else priority = 0;
      return { ...n, priority };
    }).filter(n => n.priority > 0 && n.title);
    // 광고성 기사 제거 (sector 기사는 이미 isRelevant에서 제외됨)
    const filtered = scored.filter(n => !isPRArticle(n.title));
    // 중복 제거 (유사 제목 포함) 후 우선순위 정렬
    const seen2 = new Set();
    const uniqueTitles = [];
    allNews = filtered
      .sort((a, b) => b.priority - a.priority)
      .filter(n => {
        if (seen2.has(n.title)) return false;
        // 유사 제목 체크
        const isSim = uniqueTitles.some(t => isSimilarTitle(t, n.title));
        if (isSim) return false;
        seen2.add(n.title);
        uniqueTitles.push(n.title);
        return true;
      });

    // 결과가 부족하면 구글 뉴스 RSS fallback
    const naverCount = allNews.filter(n => n.fromNaver).length;
    if (naverCount < 3 && allNews.length < 5) {
      try {
        // 한글 종목명으로 검색 (sector[0]이 한글 이름인 경우 우선 사용)
        const koreanName = sectorKeywords && sectorKeywords.length > 0 && /[가-힣]/.test(sectorKeywords[0])
          ? sectorKeywords[0]
          : stockName;
        const searchQuery = koreanName ? `${koreanName} 주식` : code;
        const googleRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=ko&gl=KR&ceid=KR:ko`;
        const gResp = await fetchWithTimeout(googleRssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml,application/xml' }
        }, 4000);
        if (gResp.ok) {
          const xml = await gResp.text();
          // CDATA 방식과 일반 텍스트 방식 모두 처리
          const titleMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[([^\]]+)\]\]>|([^<]+))<\/title>[\s\S]*?<link>([^<]+)<\/link>/gi)];
          for (const tm of titleMatches.slice(0, 15)) {
            const rawTitle = (tm[1] || tm[2] || '').trim();
            const title = rawTitle.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            const url = (tm[3] || '').trim();
            if (!title || title.length < 4) continue;
            // 한국어 또는 종목명(영문) 포함 기사 허용
            const hasKorean = /[가-힣]/.test(title);
            const hasEnglishName = stockName && /^[A-Z]/.test(stockName) && title.toUpperCase().includes(stockName.toUpperCase());
            // 관련성 필터 적용 (isRelevant에서 한글 이름도 체크)
            const rel = isRelevant(title);
            if ((hasKorean || hasEnglishName) && rel === true) {
              allNews.push({ title, url, fromGoogle: true, priority: 3 });
            }
          }
        }
      } catch { /* ignore */ }
    }

    // 직접 관련 기사만 반환 (isRelevant=true인 것만 남아있음)
    return allNews.slice(0, 5).map(n => ({
      title: n.title ?? '',
      url: n.url || `https://finance.naver.com/item/news.naver?code=${code}`,
      publishTime: 0,
      relatedTickers: [],
    }));
  } catch {
    return [];
  }
}

// ─── 뉴스 긍정/부정 판별 키워드 ──────────────────────────────────────────────
const BULLISH_KEYWORDS = [
  // 실적 호재
  "어닝서프라이즈", "실적 서프라이즈", "어닝 서프라이즈", "실적 상회", "최대 실적", "사상 최대",
  "영업이익 증가", "매출 증가", "순이익 증가", "흑자전환", "실적 개선", "실적 호조", "어닝",
  // 투자의견
  "목표주가 상향", "투자의견 상향", "매수 추천", "신규 편입", "목표가 상향", "비중확대",
  "강력매수", "적극매수", "매수", "아웃퍼폼",
  // 가격 상승
  "신고가", "52주 신고가", "상장 이후 최고", "역대 최고", "최고가",
  "급등", "상한가", "강세", "랠리", "반등", "상승", "오름세", "강력 상승",
  // 사업 호재
  "수주", "계약 체결", "대규모 계약", "수주 잔고", "수주 성공", "낙찰",
  "인수", "합병", "파트너십", "전략적 제휴", "협약", "MOU",
  "자사주 매입", "배당 증가", "특별배당", "자사주",
  "FDA 승인", "임상 성공", "허가 획득", "승인", "인허가",
  "수출 증가", "해외 진출", "신시장 개척", "글로벌 확장",
  "신제품", "출시", "론칭", "개발 성공",
  // 영어
  "beat", "surge", "rally", "upgrade", "buy", "outperform", "record high",
  "acquisition", "partnership", "approval", "dividend", "buyback",
];

const BEARISH_KEYWORDS = [
  // 실적 악재
  "실적 쇼크", "어닝 쇼크", "실적 부진", "실적 하회", "영업손실", "적자전환", "순손실",
  "영업이익 감소", "매출 감소", "순이익 감소", "실적 악화", "실적 충격",
  // 투자의견 하향
  "목표주가 하향", "투자의견 하향", "매도 추천", "목표가 하향", "비중축소",
  "매도", "언더퍼폼", "중립 하향",
  // 가격 하락
  "급락", "하한가", "약세", "매도세", "하락", "폭락", "추락", "내림세",
  // 법적/규제 리스크
  "소송", "과징금", "제재", "조사", "검찰", "수사", "고발", "기소",
  "공정위", "금감원 제재", "금융당국", "규제",
  // 사업 악재
  "파산", "워크아웃", "구조조정", "감원", "정리해고", "희망퇴직",
  "수주 취소", "계약 해지", "계약 취소",
  "리콜", "결함", "안전 문제", "사고",
  // 서비스/사업 종료
  "종말", "서비스 종료", "사업 철수", "폐지", "폐업", "종료", "중단",
  "함락", "위기", "붕괴", "몰락", "퇴출",
  // 영어
  "miss", "plunge", "downgrade", "sell", "underperform", "loss", "decline",
  "lawsuit", "investigation", "fine", "layoff", "bankruptcy", "recall",
];

// 점수: 긍정=10, 부정=0, 중립=5
function getArticleScore(title) {
  if (!title) return { score: 5, sentiment: 'neutral' };
  const t = title.toLowerCase();
  const bullishHits = BULLISH_KEYWORDS.filter(w => t.includes(w.toLowerCase()));
  const bearishHits = BEARISH_KEYWORDS.filter(w => t.includes(w.toLowerCase()));
  const bullishCount = bullishHits.length;
  const bearishCount = bearishHits.length;

  if (bearishCount > bullishCount) return { score: 0, sentiment: 'bearish' };
  if (bullishCount > bearishCount) return { score: 10, sentiment: 'bullish' };
  if (bullishCount === 0 && bearishCount === 0) return { score: 5, sentiment: 'neutral' };
  // 동점이면 중립
  return { score: 5, sentiment: 'neutral' };
}

// ─── 뉴스 점수 계산 ───────────────────────────────────────────────────────────
function calcNewsScore(newsItems) {
  const slots = [];
  for (let i = 0; i < 5; i++) {
    if (i < newsItems.length) {
      const item = newsItems[i];
      const title = typeof item === "string" ? item : (item.title ?? "");
      const { score: pts, sentiment } = getArticleScore(title);
      const url = (typeof item === "object" && item.url) ? item.url : `https://finance.naver.com/`;
      // 기사당 20점 (bullish=20, bearish=0, neutral=10)
      const pts20 = sentiment === 'bullish' ? 20 : sentiment === 'bearish' ? 0 : 10;
      slots.push({ title, url, pts: pts20, bullish: sentiment === 'bullish', sentiment });
    } else {
      slots.push({ title: "관련 기사 없음", pts: 10, bullish: false, sentiment: 'neutral' });
    }
  }
  const rawScore = slots.reduce((sum, s) => sum + s.pts, 0);
  const score = Math.round(rawScore * 0.10); // 10% 반영 (max 10점)
  return { score, rawScore, slots };
}

// ─── 기관 매수 체크리스트 (10개 × 10점, 최대 100점 → 45% 반영 = 45점) ─────────
const INST_CHECKLIST = [
  {
    id: "I1",
    label: "종목 RS > 지수 RS × 1.05 (코스피200 대비 상대 강도 우위)",
    desc: "3개월 종목 수익률이 코스피200 수익률의 1.05배 초과 — 기관 선호 모멘텀 종목",
    check: (q) => typeof q.rsVsIndex === 'number' && q.rsVsIndex > q.indexReturn * 0.05,
  },
  {
    id: "I2",
    label: "현재가 > VWAP AND 평균 체결 규모 > 20일 평균 × 1.5",
    desc: "VWAP 상단 유지 + 대량 체결 — 기관 매집 동시 확인",
    check: (q) => q.price > q.vwap && (q.avgVolume > 0 ? q.volume / q.avgVolume : 1) >= 1.5,
  },
  {
    id: "I3",
    label: "5분봉 누적 순매수 우위 (상승분봉 거래량 > 하락분봉)",
    desc: "당일 5분봉 기준 상승 분봉 거래량 합 > 하락 분봉 거래량 합 — 기관 순매수 Proxy",
    check: (q) => typeof q.intradayNetBuy === 'number' && q.intradayNetBuy > 0,
  },
  {
    id: "I4",
    label: "최근 10분 변동폭 ≤ 60분 평균 × 0.7 (변동성 수축)",
    desc: "단기 변동폭 축소 — 기관 조용한 매집 구간 신호",
    check: (q) => typeof q.range10m === 'number' && typeof q.range60m === 'number'
      && q.range60m > 0 && q.range10m <= q.range60m * 0.7,
  },
  {
    id: "I5",
    label: "당일 체결 강도 ≥ 120% (Volume Power)",
    desc: "(매수 체결량 / 매도 체결량) × 100 ≥ 120 — 매수 우위 확인",
    check: (q) => typeof q.volumePower === 'number' && q.volumePower >= 120,
  },
  {
    id: "I6",
    label: "현재가 > 당일 최대 거래 발생 가격대",
    desc: "5분봉 최대 거래량 분봉 종가 돌파 — 핵심 매물대 상단 돌파 확인",
    check: (q) => typeof q.maxVolBarClose === 'number' && q.price > q.maxVolBarClose,
  },
  {
    id: "I7",
    label: "MFI(14) 60~80 (자금유입 강세 구간)",
    desc: "Money Flow Index 60~80 — 과열 없는 자금 유입 확인",
    check: (q) => typeof q.mfi14 === 'number' && q.mfi14 >= 60 && q.mfi14 <= 80,
  },
  {
    id: "I8",
    label: "단기 변동성(5일) / 장기 변동성(20일) < 0.8",
    desc: "변동성 수축 — 안정적 상승 구간 진입 신호",
    check: (q) => typeof q.vol5 === 'number' && typeof q.vol20 === 'number'
      && q.vol20 > 0 && q.vol5 / q.vol20 < 0.8,
  },
  {
    id: "I9",
    label: "현재가 > 시가 AND 현재가 ≥ 전일 종가 × 1.01",
    desc: "갭업 또는 강한 당일 상승 — 기관 매수세 확인",
    check: (q) => q.price > q.open && q.price >= q.prevClose * 1.01,
  },
  {
    id: "I10",
    label: "최근 3~5거래일 종가 순보유 비중 상승 (Proxy)",
    desc: "최근 3~5일 종가 연속 상승 추세 — 기관 지분 축적 간접 신호",
    check: (q) => {
      if (!q.closes || q.closes.length < 5) return false;
      const last5 = q.closes.slice(-5);
      let upDays = 0;
      for (let i=1; i<last5.length; i++) if (last5[i]>last5[i-1]) upDays++;
      return upDays >= 3;
    },
  },
];

function calcInstitutionalScore(q) {
  let rawScore = 0;
  const checklist = INST_CHECKLIST.map(item => {
    const passed = item.check(q);
    if (passed) rawScore += 10;
    return { id: item.id, label: item.label, desc: item.desc, pts: passed ? 10 : 0, passed };
  });
  const score = Math.round(rawScore * 0.45); // 45% 반영
  return { score, rawScore, checklist };
}

// ─── 차트 분석 체크리스트 (10개 × 10점, 최대 100점 → 40% 반영 = 40점) ───────
const CHART_CHECKLIST = [
  {
    id: "T1",
    label: "BB 폭 30일 최저치 근접 (스퀘즈 진입)",
    desc: "볼린저 밴드 폭이 30일 최소치 ×1.2 이내 — 변동성 수축 후 대형 이동 진입 신호",
    check: (q) => {
      if (!q.closes || !q.highs || !q.lows || q.closes.length < 20) return false;
      const widths = [];
      for (let i = 20; i <= q.closes.length; i++) {
        const w = q.closes.slice(i-20, i);
        const mid = w.reduce((a,b)=>a+b,0)/20;
        const std = Math.sqrt(w.reduce((a,b)=>a+Math.pow(b-mid,2),0)/20);
        widths.push(4*std);
      }
      const minW30 = Math.min(...widths.slice(-30));
      return widths[widths.length-1] <= minW30 * 1.2;
    },
  },
  {
    id: "T2",
    label: "5일 이평선 기울기 하락 후 당일 반등",
    desc: "3일 기울기 음수 + 당일 기울기 양수 — 단기 눌림목 반등 신호",
    check: (q) => {
      if (!q.closes || q.closes.length < 8) return false;
      const c = q.closes;
      const ma5 = (i) => c.slice(i-4, i+1).reduce((a,b)=>a+b,0)/5;
      const slope3 = (ma5(c.length-1) - ma5(c.length-4)) / 3;
      const slope1 = ma5(c.length-1) - ma5(c.length-2);
      return slope3 < 0 && slope1 > 0;
    },
  },
  {
    id: "T3",
    label: "거래량 급감 (눌림목 확인)",
    desc: "당일 거래량 ≤ 5일 평균 ×0.8 — 매도 없는 조용한 눌림목 확인",
    check: (q) => {
      if (!q.volumes || q.volumes.length < 6) return false;
      const avg5 = q.volumes.slice(-6, -1).reduce((a,b)=>a+b,0)/5;
      return q.volume <= avg5 * 0.8;
    },
  },
  {
    id: "T4",
    label: "RSI 45~60 (과열 제외 강세 진입)",
    desc: "RSI 45~60 구간 — 과열 없이 상승 모멘텀 유지 중",
    check: (q) => q.rsi >= 45 && q.rsi <= 60,
  },
  {
    id: "T5",
    label: "20일선 터치 후 지지 반등",
    desc: "저가 ≤ MA20×1.005 AND 종가 > MA20 — 중기 지지선 터치 후 반등 확인",
    check: (q) => q.dayLow <= q.ma20 * 1.005 && q.price > q.ma20,
  },
  {
    id: "T6",
    label: "MACD 히스토그램 음수권 상승",
    desc: "Hist[t-2] < Hist[t-1] < Hist[t] < 0 — 하락 속도 지속 감소, 바닥 접근 신호",
    check: (q) => {
      if (!q.closes || q.closes.length < 35) return false;
      const c = q.closes;
      const k12 = 2/13, k26 = 2/27, k9 = 2/10;
      let e12 = c.slice(0,12).reduce((a,b)=>a+b,0)/12;
      let e26 = c.slice(0,26).reduce((a,b)=>a+b,0)/26;
      for (let i=12; i<26; i++) e12 = c[i]*k12 + e12*(1-k12);
      let sig = e12 - e26;
      const hists = [];
      for (let i=26; i<c.length; i++) {
        e12 = c[i]*k12 + e12*(1-k12);
        e26 = c[i]*k26 + e26*(1-k26);
        const ml = e12 - e26;
        sig = ml*k9 + sig*(1-k9);
        hists.push(ml - sig);
      }
      if (hists.length < 3) return false;
      const [h2, h1, h0] = hists.slice(-3);
      return h2 < h1 && h1 < h0 && h0 < 0;
    },
  },
  {
    id: "T7",
    label: "망치형/도지형 캔들 (하방 경직성)",
    desc: "(종가-저가)/(고가-저가) ≥ 0.7 — 하단 거절로 매수세 우위 확인",
    check: (q) => {
      const range = q.dayHigh - q.dayLow;
      return range > 0 ? (q.price - q.dayLow) / range >= 0.7 : false;
    },
  },
  {
    id: "T8",
    label: "당일 최대 거래량 분봉 종가 돌파",
    desc: "종가 > 당일 5분봉 중 최대거래량 분봉 종가 — 기관 대량 체결 구간 돌파 확인",
    check: (q) => typeof q.maxVolBarClose === 'number' ? q.price > q.maxVolBarClose : false,
  },
  {
    id: "T9",
    label: "52주 고점 -30%~-5% 구간",
    desc: "52주 고점 대비 70~95% 구간 — 대형 상승 전 눌림목 지점",
    check: (q) => q.high52w > 0 && q.price >= q.high52w * 0.70 && q.price <= q.high52w * 0.95,
  },
  {
    id: "T10",
    label: "VWAP 상향 돌파 초입 (VWAP×1.002~1.005)",
    desc: "VWAP×1.002 ≤ 종가 ≤ VWAP×1.005 — 기관 평균단가 상향 돌파 직후 진입 구간",
    check: (q) => q.vwap > 0 && q.price >= q.vwap * 1.002 && q.price <= q.vwap * 1.005,
  },
];

function calcChartScore(q) {
  let rawScore = 0;
  const checklist = CHART_CHECKLIST.map(item => {
    const passed = item.check(q);
    if (passed) rawScore += 10;
    return { id: item.id, label: item.label, desc: item.desc, pts: passed ? 10 : 0, passed };
  });
  const score = Math.round(rawScore * 0.45); // 45% 반영
  return { score, rawScore, checklist };
}

// ─── 코스피200 벤치마크 3개월 수익률 계산 ────────────────────────────────────
async function fetchIndexReturn() {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/%5EKS200?interval=1d&range=90d`;
    const resp = await fetchWithTimeout(url, { headers: YF_HEADERS }, 5000);
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(v => v != null);
    if (closes.length < 2) return null;
    const first = closes[0], last = closes[closes.length - 1];
    return first > 0 ? (last - first) / first : null;
  } catch {
    return null;
  }
}

// ─── 메인 API 핸들러 ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const BATCH = 25;
    const results = [];

    // 코스피200 3개월 수익률 (RS 비교용) — 한 번만 fetch
    const indexReturn = await fetchIndexReturn();

    for (let i = 0; i < STOCKS.length; i += BATCH) {
      const batch = STOCKS.slice(i, i + BATCH);
      const batchRes = await Promise.allSettled(
        batch.map(async (stock) => {
          const [quoteRes, newsRes, intradayRes] = await Promise.allSettled([
            fetchQuote(stock.ticker),
            fetchNews(stock.ticker, stock.name, stock.sector || []),
            fetchIntradayData(stock.ticker),
          ]);

          const q = quoteRes.status === "fulfilled" ? quoteRes.value : null;
          const newsItems = newsRes.status === "fulfilled" ? newsRes.value : [];
          const intraday = intradayRes.status === "fulfilled" ? intradayRes.value : null;

          if (!q || q.price === 0) return null;

          // 5분봉 intraday 데이터 주입
          const marketOpen = isMarketHours();
          if (intraday) {
            if (typeof intraday.maxVolBarClose === 'number') q.maxVolBarClose = intraday.maxVolBarClose;
            if (typeof intraday.intradayNetBuy === 'number')  q.intradayNetBuy = intraday.intradayNetBuy;
            if (typeof intraday.range10m === 'number')        q.range10m = intraday.range10m;
            if (typeof intraday.range60m === 'number')        q.range60m = intraday.range60m;
            if (typeof intraday.volumePower === 'number')     q.volumePower = intraday.volumePower;
            // 거래 시간대(프리마켓~에프터마켓)에만 1분봉 실시간 가격 사용
            // 휴장/비장 시간대에는 prevClose(종가) 기준 유지
            if (marketOpen && typeof intraday.realtimePrice === 'number' && intraday.realtimePrice > 0) {
              q.price = intraday.realtimePrice;
            }
          }
          // 휴장 시 price를 prevClose(종가)로 강제 설정
          if (!marketOpen && q.prevClose > 0) {
            q.price = q.prevClose;
            q.chgPct = 0; // 휴장 시 등락률 0
          }

          // RS vs 코스피200: 종목 3개월 수익률 계산 + indexReturn 주입
          q.indexReturn = indexReturn ?? 0;
          if (q.closes && q.closes.length >= 2) {
            const first = q.closes[0];
            const last  = q.closes[q.closes.length - 1];
            const stockReturn = first > 0 ? (last - first) / first : 0;
            q.rsVsIndex = indexReturn != null ? stockReturn - indexReturn : stockReturn;
          } else {
            q.rsVsIndex = 0;
          }

          const inst  = calcInstitutionalScore(q);
          const chart = calcChartScore(q);
          const news  = calcNewsScore(newsItems);

          const total = inst.score + chart.score + news.score;

          return {
            ticker:    stock.ticker,
            name:      stock.name,
            price:     Math.round(q.price),          // 원화는 정수
            prevClose: Math.round(q.prevClose),
            chgPct:    Math.round(q.chgPct * 100) / 100,
            riskLevel: stock.risk,
            score:     total,
            breakdown: {
              institutional:    inst.score,
              institutionalRaw: inst.rawScore,
              chart:            chart.score,
              chartRaw:         chart.rawScore,
              news:             news.score,
              newsRaw:          news.rawScore,
            },
            instChecklist:  inst.checklist,
            chartChecklist: chart.checklist,
            newsSlots:      news.slots,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      for (const r of batchRes) {
        if (r.status === "fulfilled" && r.value) results.push(r.value);
      }
    }

    results.sort((a, b) => b.score - a.score);

    const grouped = {
      all:        results.slice(0, 5),
      very_safe:  results.filter(r => r.riskLevel === "very_safe").slice(0, 5),
      safe:       results.filter(r => r.riskLevel === "safe").slice(0, 5),
      moderate:   results.filter(r => r.riskLevel === "moderate").slice(0, 5),
      risky:      results.filter(r => r.riskLevel === "risky").slice(0, 5),
      very_risky: results.filter(r => r.riskLevel === "very_risky").slice(0, 5),
    };

    // 현재 세션 정보 계산
    const holiday = isKrHoliday();
    let sessionLabel = '휴장';
    if (!holiday) {
      const kst = getKstDate();
      const minOfDay = kst.getHours() * 60 + kst.getMinutes();
      if (minOfDay >= 480 && minOfDay < 540)       sessionLabel = '프리마켓';
      else if (minOfDay >= 540 && minOfDay < 930)  sessionLabel = '정규장';
      else if (minOfDay >= 930 && minOfDay < 1080) sessionLabel = '에프터마켓';
      else                                          sessionLabel = '휴장';
    }

    return res.status(200).json({
      ok: true,
      updatedAt: new Date().toISOString(),
      total: results.length,
      session: sessionLabel,
      isHoliday: holiday,
      grouped,
      all: results,
    });

  } catch (err) {
    console.error("KR Stock API Error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal server error" });
  }
}
