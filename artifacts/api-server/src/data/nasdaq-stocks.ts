export interface NasdaqStock {
  symbol: string;
  name: string;
  sector: string;
  capTier: "mega" | "large" | "mid" | "small" | "micro";
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  week52High: number;
  week52Low: number;
}

const KNOWN_STOCKS: [string, string, string, string][] = [
  ["AAPL","Apple Inc.","Technology","mega"],
  ["MSFT","Microsoft Corporation","Technology","mega"],
  ["GOOGL","Alphabet Inc. Class A","Technology","mega"],
  ["GOOG","Alphabet Inc. Class C","Technology","mega"],
  ["AMZN","Amazon.com Inc.","Consumer Cyclical","mega"],
  ["NVDA","NVIDIA Corporation","Technology","mega"],
  ["META","Meta Platforms Inc.","Communication Services","mega"],
  ["TSLA","Tesla Inc.","Consumer Cyclical","mega"],
  ["AVGO","Broadcom Inc.","Technology","mega"],
  ["COST","Costco Wholesale Corporation","Consumer Defensive","mega"],
  ["NFLX","Netflix Inc.","Communication Services","mega"],
  ["ADBE","Adobe Inc.","Technology","mega"],
  ["AMD","Advanced Micro Devices Inc.","Technology","mega"],
  ["PEP","PepsiCo Inc.","Consumer Defensive","mega"],
  ["CSCO","Cisco Systems Inc.","Technology","mega"],
  ["INTC","Intel Corporation","Technology","large"],
  ["CMCSA","Comcast Corporation","Communication Services","mega"],
  ["TMUS","T-Mobile US Inc.","Communication Services","mega"],
  ["TXN","Texas Instruments Inc.","Technology","mega"],
  ["QCOM","QUALCOMM Inc.","Technology","mega"],
  ["INTU","Intuit Inc.","Technology","mega"],
  ["AMGN","Amgen Inc.","Healthcare","mega"],
  ["ISRG","Intuitive Surgical Inc.","Healthcare","mega"],
  ["AMAT","Applied Materials Inc.","Technology","mega"],
  ["HON","Honeywell International Inc.","Industrials","mega"],
  ["BKNG","Booking Holdings Inc.","Consumer Cyclical","mega"],
  ["LRCX","Lam Research Corporation","Technology","large"],
  ["ADP","Automatic Data Processing Inc.","Industrials","mega"],
  ["SBUX","Starbucks Corporation","Consumer Cyclical","mega"],
  ["GILD","Gilead Sciences Inc.","Healthcare","large"],
  ["MDLZ","Mondelez International Inc.","Consumer Defensive","large"],
  ["VRTX","Vertex Pharmaceuticals Inc.","Healthcare","large"],
  ["ADI","Analog Devices Inc.","Technology","large"],
  ["REGN","Regeneron Pharmaceuticals Inc.","Healthcare","large"],
  ["PANW","Palo Alto Networks Inc.","Technology","large"],
  ["SNPS","Synopsys Inc.","Technology","large"],
  ["CDNS","Cadence Design Systems Inc.","Technology","large"],
  ["KLAC","KLA Corporation","Technology","large"],
  ["MU","Micron Technology Inc.","Technology","large"],
  ["MELI","MercadoLibre Inc.","Consumer Cyclical","large"],
  ["PYPL","PayPal Holdings Inc.","Financial Services","large"],
  ["ABNB","Airbnb Inc.","Consumer Cyclical","large"],
  ["CRWD","CrowdStrike Holdings Inc.","Technology","large"],
  ["MRVL","Marvell Technology Inc.","Technology","large"],
  ["ORLY","O'Reilly Automotive Inc.","Consumer Cyclical","large"],
  ["FTNT","Fortinet Inc.","Technology","large"],
  ["DASH","DoorDash Inc.","Technology","large"],
  ["CTAS","Cintas Corporation","Industrials","large"],
  ["DXCM","DexCom Inc.","Healthcare","large"],
  ["CEG","Constellation Energy Corp.","Utilities","large"],
  ["KDP","Keurig Dr Pepper Inc.","Consumer Defensive","large"],
  ["MNST","Monster Beverage Corporation","Consumer Defensive","large"],
  ["AEP","American Electric Power Co.","Utilities","large"],
  ["PAYX","Paychex Inc.","Industrials","large"],
  ["PCAR","PACCAR Inc.","Industrials","large"],
  ["MCHP","Microchip Technology Inc.","Technology","large"],
  ["ROST","Ross Stores Inc.","Consumer Cyclical","large"],
  ["IDXX","IDEXX Laboratories Inc.","Healthcare","large"],
  ["ODFL","Old Dominion Freight Line Inc.","Industrials","large"],
  ["EXC","Exelon Corporation","Utilities","large"],
  ["FAST","Fastenal Company","Industrials","large"],
  ["CPRT","Copart Inc.","Industrials","large"],
  ["EA","Electronic Arts Inc.","Communication Services","large"],
  ["VRSK","Verisk Analytics Inc.","Industrials","large"],
  ["BKR","Baker Hughes Company","Energy","large"],
  ["XEL","Xcel Energy Inc.","Utilities","large"],
  ["CTSH","Cognizant Technology Solutions","Technology","large"],
  ["KHC","The Kraft Heinz Company","Consumer Defensive","large"],
  ["GEHC","GE HealthCare Technologies Inc.","Healthcare","large"],
  ["ON","ON Semiconductor Corporation","Technology","large"],
  ["DDOG","Datadog Inc.","Technology","large"],
  ["ANSS","ANSYS Inc.","Technology","large"],
  ["ZS","Zscaler Inc.","Technology","large"],
  ["TTWO","Take-Two Interactive Software","Communication Services","large"],
  ["CDW","CDW Corporation","Technology","large"],
  ["TTD","The Trade Desk Inc.","Technology","large"],
  ["CSGP","CoStar Group Inc.","Real Estate","large"],
  ["GFS","GlobalFoundries Inc.","Technology","large"],
  ["TEAM","Atlassian Corporation","Technology","large"],
  ["WBD","Warner Bros. Discovery Inc.","Communication Services","mid"],
  ["FANG","Diamondback Energy Inc.","Energy","large"],
  ["ALGN","Align Technology Inc.","Healthcare","large"],
  ["ILMN","Illumina Inc.","Healthcare","large"],
  ["ENPH","Enphase Energy Inc.","Technology","mid"],
  ["WDAY","Workday Inc.","Technology","large"],
  ["BIIB","Biogen Inc.","Healthcare","large"],
  ["SIRI","Sirius XM Holdings Inc.","Communication Services","mid"],
  ["ZM","Zoom Video Communications Inc.","Technology","mid"],
  ["LCID","Lucid Group Inc.","Consumer Cyclical","mid"],
  ["RIVN","Rivian Automotive Inc.","Consumer Cyclical","mid"],
  ["ROKU","Roku Inc.","Communication Services","mid"],
  ["COIN","Coinbase Global Inc.","Financial Services","large"],
  ["MRNA","Moderna Inc.","Healthcare","large"],
  ["OKTA","Okta Inc.","Technology","mid"],
  ["SNOW","Snowflake Inc.","Technology","large"],
  ["NET","Cloudflare Inc.","Technology","large"],
  ["DKNG","DraftKings Inc.","Consumer Cyclical","mid"],
  ["PLTR","Palantir Technologies Inc.","Technology","large"],
  ["SOFI","SoFi Technologies Inc.","Financial Services","mid"],
  ["HOOD","Robinhood Markets Inc.","Financial Services","mid"],
  ["RBLX","Roblox Corporation","Communication Services","mid"],
  ["U","Unity Software Inc.","Technology","mid"],
  ["PATH","UiPath Inc.","Technology","mid"],
  ["MARA","Marathon Digital Holdings","Financial Services","small"],
  ["SMCI","Super Micro Computer Inc.","Technology","large"],
  ["ARM","Arm Holdings plc","Technology","mega"],
  ["GRAB","Grab Holdings Limited","Technology","mid"],
  ["SE","Sea Limited","Consumer Cyclical","large"],
  ["JD","JD.com Inc.","Consumer Cyclical","large"],
  ["PDD","PDD Holdings Inc.","Consumer Cyclical","large"],
  ["BIDU","Baidu Inc.","Communication Services","large"],
  ["NTES","NetEase Inc.","Communication Services","large"],
  ["BILI","Bilibili Inc.","Communication Services","mid"],
  ["NIO","NIO Inc.","Consumer Cyclical","mid"],
  ["XPEV","XPeng Inc.","Consumer Cyclical","small"],
  ["LI","Li Auto Inc.","Consumer Cyclical","mid"],
  ["LULU","Lululemon Athletica Inc.","Consumer Cyclical","large"],
  ["CHWY","Chewy Inc.","Consumer Cyclical","mid"],
  ["ETSY","Etsy Inc.","Consumer Cyclical","mid"],
  ["W","Wayfair Inc.","Consumer Cyclical","mid"],
  ["PINS","Pinterest Inc.","Communication Services","mid"],
  ["SNAP","Snap Inc.","Communication Services","mid"],
  ["SQ","Block Inc.","Financial Services","large"],
  ["AFRM","Affirm Holdings Inc.","Financial Services","mid"],
  ["UPST","Upstart Holdings Inc.","Financial Services","small"],
  ["HIMS","Hims & Hers Health Inc.","Healthcare","mid"],
  ["CELH","Celsius Holdings Inc.","Consumer Defensive","mid"],
  ["DUOL","Duolingo Inc.","Technology","mid"],
  ["APP","AppLovin Corporation","Technology","large"],
  ["AXON","Axon Enterprise Inc.","Industrials","large"],
  ["DECK","Deckers Outdoor Corporation","Consumer Cyclical","large"],
  ["FSLR","First Solar Inc.","Technology","mid"],
  ["SEDG","SolarEdge Technologies Inc.","Technology","small"],
  ["TOST","Toast Inc.","Technology","mid"],
  ["BILL","BILL Holdings Inc.","Technology","mid"],
  ["MNDY","monday.com Ltd.","Technology","mid"],
  ["GLBE","Global-e Online Ltd.","Technology","mid"],
  ["SHOP","Shopify Inc.","Technology","large"],
  ["MKTX","MarketAxess Holdings Inc.","Financial Services","mid"],
  ["NDAQ","Nasdaq Inc.","Financial Services","large"],
  ["CBOE","Cboe Global Markets Inc.","Financial Services","large"],
  ["CME","CME Group Inc.","Financial Services","mega"],
  ["ICE","Intercontinental Exchange","Financial Services","mega"],
  ["IBKR","Interactive Brokers Group","Financial Services","large"],
  ["LPLA","LPL Financial Holdings","Financial Services","large"],
  ["TROW","T. Rowe Price Group Inc.","Financial Services","large"],
  ["NWSA","News Corporation Class A","Communication Services","mid"],
  ["FOX","Fox Corporation Class B","Communication Services","mid"],
  ["FOXA","Fox Corporation Class A","Communication Services","mid"],
  ["PARA","Paramount Global","Communication Services","mid"],
  ["LYV","Live Nation Entertainment","Communication Services","large"],
  ["MAR","Marriott International Inc.","Consumer Cyclical","large"],
  ["EXPE","Expedia Group Inc.","Consumer Cyclical","large"],
  ["TRIP","TripAdvisor Inc.","Consumer Cyclical","small"],
  ["WYNN","Wynn Resorts Limited","Consumer Cyclical","mid"],
  ["MGM","MGM Resorts International","Consumer Cyclical","mid"],
  ["PENN","Penn Entertainment Inc.","Consumer Cyclical","small"],
  ["SBAC","SBA Communications Corp.","Real Estate","large"],
  ["EQIX","Equinix Inc.","Real Estate","mega"],
  ["DLR","Digital Realty Trust Inc.","Real Estate","large"],
  ["ARE","Alexandria Real Estate Equities","Real Estate","large"],
  ["MAA","Mid-America Apartment","Real Estate","mid"],
  ["EXR","Extra Space Storage Inc.","Real Estate","large"],
  ["HST","Host Hotels & Resorts Inc.","Real Estate","mid"],
  ["GLPI","Gaming and Leisure Properties","Real Estate","mid"],
  ["WBA","Walgreens Boots Alliance","Healthcare","mid"],
  ["ZBH","Zimmer Biomet Holdings","Healthcare","large"],
  ["HOLX","Hologic Inc.","Healthcare","large"],
  ["TECH","Bio-Techne Corporation","Healthcare","mid"],
  ["NBIX","Neurocrine Biosciences Inc.","Healthcare","mid"],
  ["EXAS","Exact Sciences Corporation","Healthcare","mid"],
  ["RARE","Ultragenyx Pharmaceutical","Healthcare","small"],
  ["BMRN","BioMarin Pharmaceutical Inc.","Healthcare","mid"],
  ["JAZZ","Jazz Pharmaceuticals plc","Healthcare","mid"],
  ["SRPT","Sarepta Therapeutics Inc.","Healthcare","mid"],
  ["INCY","Incyte Corporation","Healthcare","mid"],
  ["ALNY","Alnylam Pharmaceuticals Inc.","Healthcare","large"],
  ["PCVX","Vaxcyte Inc.","Healthcare","mid"],
  ["DOCU","DocuSign Inc.","Technology","mid"],
  ["VEEV","Veeva Systems Inc.","Healthcare","large"],
  ["PTON","Peloton Interactive Inc.","Consumer Cyclical","small"],
  ["BYND","Beyond Meat Inc.","Consumer Defensive","small"],
  ["LYFT","Lyft Inc.","Technology","mid"],
  ["UBER","Uber Technologies Inc.","Technology","mega"],
  ["SPOT","Spotify Technology S.A.","Communication Services","large"],
  ["SQ","Block Inc.","Financial Services","large"],
  ["TWLO","Twilio Inc.","Technology","mid"],
  ["MDB","MongoDB Inc.","Technology","large"],
  ["CFLT","Confluent Inc.","Technology","mid"],
  ["ESTC","Elastic N.V.","Technology","mid"],
  ["HUBS","HubSpot Inc.","Technology","large"],
  ["PCOR","Procore Technologies Inc.","Technology","mid"],
  ["SMAR","Smartsheet Inc.","Technology","mid"],
  ["DBX","Dropbox Inc.","Technology","mid"],
  ["SQSP","Squarespace Inc.","Technology","mid"],
  ["DOCN","DigitalOcean Holdings Inc.","Technology","small"],
  ["GTLB","GitLab Inc.","Technology","mid"],
  ["IOT","Samsara Inc.","Technology","mid"],
  ["CYBR","CyberArk Software Ltd.","Technology","mid"],
  ["TENB","Tenable Holdings Inc.","Technology","mid"],
  ["QLYS","Qualys Inc.","Technology","mid"],
  ["RPD","Rapid7 Inc.","Technology","mid"],
  ["FFIV","F5 Inc.","Technology","mid"],
  ["AKAM","Akamai Technologies Inc.","Technology","mid"],
  ["JNPR","Juniper Networks Inc.","Technology","mid"],
  ["NTAP","NetApp Inc.","Technology","mid"],
  ["PSTG","Pure Storage Inc.","Technology","mid"],
  ["CHTR","Charter Communications Inc.","Communication Services","large"],
  ["LBRDK","Liberty Broadband Corp.","Communication Services","mid"],
  ["ICLR","ICON Plc","Healthcare","large"],
  ["CG","Carlyle Group Inc.","Financial Services","large"],
  ["RKT","Rocket Companies Inc.","Financial Services","mid"],
  ["LC","LendingClub Corporation","Financial Services","small"],
  ["ALLY","Ally Financial Inc.","Financial Services","mid"],
  ["FITB","Fifth Third Bancorp","Financial Services","large"],
  ["HBAN","Huntington Bancshares","Financial Services","large"],
  ["KEY","KeyCorp","Financial Services","mid"],
  ["CFG","Citizens Financial Group","Financial Services","mid"],
  ["ZION","Zions Bancorporation","Financial Services","mid"],
  ["WAL","Western Alliance Bancorporation","Financial Services","mid"],
  ["EWBC","East West Bancorp Inc.","Financial Services","mid"],
  ["SIVB","SVB Financial Group","Financial Services","mid"],
  ["PACW","PacWest Bancorp","Financial Services","small"],
  ["SBNY","Signature Bank","Financial Services","small"],
  ["CUBI","Customers Bancorp Inc.","Financial Services","small"],
  ["SSB","SouthState Corporation","Financial Services","mid"],
  ["FFIN","First Financial Bankshares","Financial Services","mid"],
  ["BOKF","BOK Financial Corporation","Financial Services","mid"],
  ["FNB","F.N.B. Corporation","Financial Services","mid"],
  ["UMBF","UMB Financial Corporation","Financial Services","mid"],
  ["CADE","Cadence Bank","Financial Services","mid"],
  ["WTFC","Wintrust Financial Corp.","Financial Services","mid"],
  ["GBCI","Glacier Bancorp Inc.","Financial Services","mid"],
  ["WSFS","WSFS Financial Corporation","Financial Services","small"],
  ["TRMB","Trimble Inc.","Technology","mid"],
  ["MANH","Manhattan Associates Inc.","Technology","mid"],
  ["PAYC","Paycom Software Inc.","Technology","mid"],
  ["PCTY","Paylocity Holding Corp.","Technology","mid"],
  ["WEX","WEX Inc.","Financial Services","mid"],
  ["GPN","Global Payments Inc.","Financial Services","large"],
  ["FIS","Fidelity National Information","Financial Services","large"],
  ["FISV","Fiserv Inc.","Financial Services","mega"],
  ["VRSN","VeriSign Inc.","Technology","mid"],
  ["SWKS","Skyworks Solutions Inc.","Technology","mid"],
  ["QRVO","Qorvo Inc.","Technology","mid"],
  ["MPWR","Monolithic Power Systems","Technology","large"],
  ["WOLF","Wolfspeed Inc.","Technology","small"],
  ["CRUS","Cirrus Logic Inc.","Technology","mid"],
  ["SLAB","Silicon Laboratories Inc.","Technology","mid"],
  ["LSCC","Lattice Semiconductor Corp.","Technology","mid"],
  ["MTSI","MACOM Technology Solutions","Technology","mid"],
  ["RMBS","Rambus Inc.","Technology","mid"],
  ["SITM","SiTime Corporation","Technology","small"],
  ["ONTO","Onto Innovation Inc.","Technology","mid"],
  ["FORM","FormFactor Inc.","Technology","small"],
  ["COHR","Coherent Corp.","Technology","mid"],
  ["LITE","Lumentum Holdings Inc.","Technology","mid"],
  ["VIAV","Viavi Solutions Inc.","Technology","small"],
  ["IRDM","Iridium Communications Inc.","Communication Services","mid"],
  ["SATS","EchoStar Corporation","Communication Services","mid"],
  ["GRMN","Garmin Ltd.","Technology","large"],
  ["ZBRA","Zebra Technologies Corp.","Technology","mid"],
  ["TER","Teradyne Inc.","Technology","mid"],
  ["ENTG","Entegris Inc.","Technology","large"],
  ["MKSI","MKS Instruments Inc.","Technology","mid"],
  ["NOVT","Novanta Inc.","Technology","mid"],
  ["AZPN","Aspen Technology Inc.","Technology","mid"],
  ["NTNX","Nutanix Inc.","Technology","mid"],
  ["PEGA","Pegasystems Inc.","Technology","mid"],
  ["APPF","AppFolio Inc.","Technology","mid"],
  ["AGYS","Agilysys Inc.","Technology","small"],
  ["ALRM","Alarm.com Holdings Inc.","Technology","mid"],
  ["JAMF","Jamf Holding Corp.","Technology","small"],
  ["INTA","Intapp Inc.","Technology","small"],
  ["KD","Kyndryl Holdings Inc.","Technology","mid"],
  ["DXC","DXC Technology Company","Technology","mid"],
  ["EPAM","EPAM Systems Inc.","Technology","mid"],
  ["GLOB","Globant S.A.","Technology","mid"],
  ["WIT","Wipro Limited","Technology","large"],
  ["INFY","Infosys Limited","Technology","large"],
  ["HDB","HDFC Bank Limited","Financial Services","mega"],
  ["IBN","ICICI Bank Limited","Financial Services","large"],
  ["BABA","Alibaba Group Holding","Consumer Cyclical","large"],
  ["TCOM","Trip.com Group Limited","Consumer Cyclical","large"],
  ["YUMC","Yum China Holdings Inc.","Consumer Cyclical","large"],
  ["VNET","VNET Group Inc.","Technology","small"],
  ["WB","Weibo Corporation","Communication Services","small"],
  ["QFIN","360 Finance Inc.","Financial Services","small"],
  ["TIGR","UP Fintech Holding Limited","Financial Services","small"],
  ["FUTU","Futu Holdings Limited","Financial Services","mid"],
  ["MNSO","MINISO Group Holding","Consumer Cyclical","mid"],
  ["TAL","TAL Education Group","Consumer Cyclical","mid"],
  ["EDU","New Oriental Education","Consumer Cyclical","mid"],
  ["BGNE","BeiGene Ltd.","Healthcare","large"],
  ["LEGN","Legend Biotech Corporation","Healthcare","mid"],
  ["ZLAB","Zai Lab Limited","Healthcare","small"],
  ["IMVT","Immunovant Inc.","Healthcare","small"],
  ["RXRX","Recursion Pharmaceuticals","Healthcare","small"],
  ["DNA","Ginkgo Bioworks Holdings","Healthcare","small"],
  ["KRYS","Krystal Biotech Inc.","Healthcare","mid"],
  ["NUVB","Nuvation Bio Inc.","Healthcare","small"],
  ["RCKT","Rocket Pharmaceuticals Inc.","Healthcare","small"],
  ["APLS","Apellis Pharmaceuticals","Healthcare","mid"],
  ["PTCT","PTC Therapeutics Inc.","Healthcare","small"],
  ["FOLD","Amicus Therapeutics Inc.","Healthcare","mid"],
  ["INSM","Insmed Incorporated","Healthcare","mid"],
  ["MDGL","Madrigal Pharmaceuticals","Healthcare","mid"],
  ["ARWR","Arrowhead Pharmaceuticals","Healthcare","mid"],
  ["IONS","Ionis Pharmaceuticals Inc.","Healthcare","mid"],
  ["CYTK","Cytokinetics Incorporated","Healthcare","mid"],
  ["ARVN","Arvinas Inc.","Healthcare","small"],
  ["PRTA","Prothena Corporation plc","Healthcare","small"],
  ["CRNX","Crinetics Pharmaceuticals","Healthcare","mid"],
  ["VERA","Vera Therapeutics Inc.","Healthcare","small"],
  ["RPRX","Royalty Pharma plc","Healthcare","large"],
  ["UTHR","United Therapeutics Corp.","Healthcare","large"],
  ["NTRA","Natera Inc.","Healthcare","large"],
  ["TW","Tradeweb Markets Inc.","Financial Services","large"],
  ["LPLA","LPL Financial Holdings","Financial Services","large"],
  ["SEIC","SEI Investments Company","Financial Services","mid"],
  ["MORN","Morningstar Inc.","Financial Services","mid"],
  ["VIRT","Virtu Financial Inc.","Financial Services","mid"],
  ["IBKR","Interactive Brokers Group","Financial Services","large"],
  ["MSCI","MSCI Inc.","Financial Services","large"],
  ["SPGI","S&P Global Inc.","Financial Services","mega"],
  ["VRNS","Varonis Systems Inc.","Technology","mid"],
  ["SAIL","SailPoint Technologies","Technology","mid"],
  ["FRSH","Freshworks Inc.","Technology","mid"],
  ["BRZE","Braze Inc.","Technology","small"],
  ["AMPL","Amplitude Inc.","Technology","small"],
  ["CWAN","Clearwater Analytics","Technology","mid"],
  ["NCNO","nCino Inc.","Technology","mid"],
  ["ALKT","Alkami Technology Inc.","Technology","small"],
  ["ENV","Envestnet Inc.","Financial Services","mid"],
  ["FOUR","Shift4 Payments Inc.","Financial Services","mid"],
  ["EVTC","EVERTEC Inc.","Financial Services","mid"],
  ["NVEI","Nuvei Corporation","Financial Services","mid"],
  ["NUVB","Nuvation Bio Inc.","Healthcare","small"],
  ["XP","XP Inc.","Financial Services","mid"],
  ["STNE","StoneCo Ltd.","Financial Services","mid"],
  ["NU","Nu Holdings Ltd.","Financial Services","large"],
  ["PAGS","PagSeguro Digital Ltd.","Financial Services","mid"],
  ["CPNG","Coupang Inc.","Consumer Cyclical","large"],
  ["MELI","MercadoLibre Inc.","Consumer Cyclical","large"],
  ["GLNG","Golar LNG Limited","Energy","mid"],
  ["FCEL","FuelCell Energy Inc.","Industrials","small"],
  ["PLUG","Plug Power Inc.","Industrials","small"],
  ["BLDP","Ballard Power Systems","Industrials","small"],
  ["BE","Bloom Energy Corporation","Industrials","mid"],
  ["RUN","Sunrun Inc.","Industrials","mid"],
  ["NOVA","Sunnova Energy International","Industrials","small"],
  ["ARRY","Array Technologies Inc.","Technology","small"],
  ["SHLS","Shoals Technologies Group","Technology","small"],
  ["MAXN","Maxeon Solar Technologies","Technology","micro"],
  ["SPWR","SunPower Corporation","Technology","small"],
  ["CSIQ","Canadian Solar Inc.","Technology","mid"],
  ["JKS","JinkoSolar Holding Co.","Technology","mid"],
  ["DQ","Daqo New Energy Corp.","Basic Materials","mid"],
  ["PAYO","Payoneer Global Inc.","Financial Services","mid"],
  ["OLO","Olo Inc.","Technology","small"],
  ["CARG","CarGurus Inc.","Consumer Cyclical","mid"],
  ["OPEN","Opendoor Technologies","Real Estate","small"],
  ["RDFN","Redfin Corporation","Real Estate","small"],
  ["Z","Zillow Group Inc. Class C","Real Estate","mid"],
  ["ZG","Zillow Group Inc. Class A","Real Estate","mid"],
  ["AVLR","Avalara Inc.","Technology","mid"],
  ["VERX","Vertex Inc.","Technology","mid"],
  ["DT","Dynatrace Inc.","Technology","mid"],
  ["NEWR","New Relic Inc.","Technology","mid"],
  ["SUMO","Sumo Logic Inc.","Technology","small"],
  ["ESTC","Elastic N.V.","Technology","mid"],
  ["PTC","PTC Inc.","Technology","large"],
  ["DSGX","Descartes Systems Group","Technology","mid"],
  ["OTEX","Open Text Corporation","Technology","mid"],
  ["GEN","Gen Digital Inc.","Technology","mid"],
  ["CGNX","Cognex Corporation","Technology","mid"],
  ["MIDD","Middleby Corporation","Industrials","mid"],
  ["GNRC","Generac Holdings Inc.","Industrials","mid"],
  ["NDSN","Nordson Corporation","Industrials","large"],
  ["POOL","Pool Corporation","Consumer Cyclical","large"],
  ["WSC","WillScot Mobile Mini","Industrials","mid"],
  ["SFM","Sprouts Farmers Market","Consumer Defensive","mid"],
  ["USFD","US Foods Holding Corp.","Consumer Defensive","large"],
  ["PFGC","Performance Food Group Co.","Consumer Defensive","large"],
  ["CHEF","Chefs' Warehouse Inc.","Consumer Defensive","small"],
  ["CALM","Cal-Maine Foods Inc.","Consumer Defensive","mid"],
  ["JJSF","J & J Snack Foods Corp.","Consumer Defensive","small"],
  ["LANC","Lancaster Colony Corp.","Consumer Defensive","mid"],
  ["BRBR","BellRing Brands Inc.","Consumer Defensive","mid"],
  ["FRPT","Freshpet Inc.","Consumer Defensive","mid"],
  ["OLLI","Ollie's Bargain Outlet","Consumer Cyclical","mid"],
  ["FIVE","Five Below Inc.","Consumer Cyclical","mid"],
  ["ULTA","Ulta Beauty Inc.","Consumer Cyclical","large"],
  ["CROX","Crocs Inc.","Consumer Cyclical","mid"],
  ["BIRK","Birkenstock Holding plc","Consumer Cyclical","mid"],
  ["ON","ON Holding AG","Consumer Cyclical","mid"],
  ["SKX","Skechers U.S.A. Inc.","Consumer Cyclical","mid"],
  ["FOXF","Fox Factory Holding Corp.","Consumer Cyclical","mid"],
  ["BC","Brunswick Corporation","Consumer Cyclical","mid"],
  ["LCII","LCI Industries","Consumer Cyclical","mid"],
  ["PATK","Patrick Industries Inc.","Consumer Cyclical","mid"],
  ["IPAR","Inter Parfums Inc.","Consumer Cyclical","mid"],
  ["ELF","e.l.f. Beauty Inc.","Consumer Cyclical","mid"],
  ["COTY","Coty Inc.","Consumer Cyclical","mid"],
  ["XRAY","DENTSPLY SIRONA Inc.","Healthcare","mid"],
  ["HSIC","Henry Schein Inc.","Healthcare","mid"],
  ["PDCO","Patterson Companies Inc.","Healthcare","small"],
  ["OMCL","Omnicell Inc.","Healthcare","mid"],
  ["AMED","Amedisys Inc.","Healthcare","mid"],
  ["ACHC","Acadia Healthcare Co.","Healthcare","mid"],
  ["LNTH","Lantheus Holdings Inc.","Healthcare","mid"],
  ["AZTA","Azenta Inc.","Healthcare","mid"],
  ["BRKR","Bruker Corporation","Healthcare","mid"],
  ["NEOG","Neogen Corporation","Healthcare","small"],
  ["MMSI","Merit Medical Systems","Healthcare","mid"],
  ["NVST","Envista Holdings Corp.","Healthcare","mid"],
  ["ALGM","Allegro MicroSystems","Technology","mid"],
  ["AMKR","Amkor Technology Inc.","Technology","mid"],
  ["CEVA","CEVA Inc.","Technology","small"],
  ["DIOD","Diodes Incorporated","Technology","mid"],
  ["LFUS","Littelfuse Inc.","Technology","mid"],
  ["OLED","Universal Display Corp.","Technology","mid"],
  ["POWI","Power Integrations Inc.","Technology","mid"],
  ["SGH","SMART Global Holdings","Technology","small"],
  ["SYNA","Synaptics Incorporated","Technology","mid"],
  ["VSH","Vishay Intertechnology","Technology","small"],
  ["AAON","AAON Inc.","Industrials","mid"],
  ["BWXT","BWX Technologies Inc.","Industrials","mid"],
  ["EXPO","Exponent Inc.","Industrials","mid"],
  ["HUBB","Hubbell Incorporated","Industrials","large"],
  ["RBC","RBC Bearings Incorporated","Industrials","mid"],
  ["RRX","Regal Rexnord Corporation","Industrials","mid"],
  ["TTEK","Tetra Tech Inc.","Industrials","mid"],
  ["WMS","Advanced Drainage Systems","Industrials","mid"],
  ["CSL","Carlisle Companies Inc.","Industrials","large"],
  ["LECO","Lincoln Electric Holdings","Industrials","mid"],
  ["BFAM","Bright Horizons Family","Consumer Cyclical","mid"],
  ["HAS","Hasbro Inc.","Consumer Cyclical","mid"],
  ["NCLH","Norwegian Cruise Line","Consumer Cyclical","mid"],
  ["EXEL","Exelixis Inc.","Healthcare","mid"],
  ["BGNE","BeiGene Ltd.","Healthcare","large"],
  ["ARGX","argenx SE","Healthcare","large"],
  ["CPRX","Catalyst Pharmaceuticals","Healthcare","mid"],
  ["MEDP","Medpace Holdings Inc.","Healthcare","mid"],
];

const SECTORS = [
  "Technology", "Healthcare", "Consumer Cyclical", "Communication Services",
  "Financial Services", "Industrials", "Consumer Defensive", "Energy",
  "Basic Materials", "Real Estate", "Utilities"
];

const CAP_TIERS: NasdaqStock["capTier"][] = ["mega", "large", "mid", "small", "micro"];

const SECTOR_PREFIXES: Record<string, string[]> = {
  "Technology": ["Tech", "Digi", "Cyber", "Cloud", "Data", "Net", "Soft", "Micro", "Info", "Logic", "Byte", "Code", "Ware", "Sys", "Chip", "Bit", "Flux", "Grid", "Node", "Pix", "Sync", "Core", "Link", "Wave", "Quant", "Algo"],
  "Healthcare": ["Bio", "Med", "Thera", "Pharma", "Gene", "Vita", "Health", "Cura", "Neuro", "Onco", "Cardio", "Immuno", "Cell", "Regen", "Nano", "Prote", "Vacc", "Diag", "Path", "Ortho"],
  "Consumer Cyclical": ["Lux", "Vend", "Retail", "Auto", "Home", "Style", "Brand", "Shop", "Mart", "Prime", "Value", "Select", "Choice", "Quest", "Elite", "Urban", "Trend"],
  "Communication Services": ["Media", "Cast", "Stream", "Signal", "Voice", "Broad", "Comm", "Pulse", "Echo", "Wire", "Tele", "Vista", "Reach", "Horizon", "Beam"],
  "Financial Services": ["Cap", "Fin", "Vest", "Trust", "Asset", "Wealth", "Credit", "Fund", "Pay", "Bank", "Ledger", "Fiscal", "Equity", "Prime", "Growth"],
  "Industrials": ["Forge", "Build", "Craft", "Steel", "Aero", "Mach", "Power", "Indust", "Eng", "Fleet", "Atlas", "Apex", "Titan", "Volt", "Motor"],
  "Consumer Defensive": ["Fresh", "Pure", "Natural", "Harvest", "Green", "Whole", "Farm", "Grain", "Bloom", "Vital", "Nutri", "Leaf", "Root", "Seed"],
  "Energy": ["Solar", "Wind", "Fuel", "Petro", "Hydro", "Therm", "Watt", "Joule", "Amp", "Volt", "Renew", "Carbon", "Plasma"],
  "Basic Materials": ["Alloy", "Chem", "Mineral", "Ore", "Poly", "Resin", "Copper", "Iron", "Zinc", "Titan", "Noble", "Element"],
  "Real Estate": ["Prop", "Realty", "Land", "Tower", "Place", "Haven", "Harbor", "Crown", "Metro", "Urban", "Space", "Plaza"],
  "Utilities": ["Grid", "Power", "Hydro", "Electr", "Util", "Infra", "Serv", "Civic", "Public", "Municipal"],
};

const SUFFIXES = [
  "Corp.", "Inc.", "Holdings", "Group", "Ltd.", "Technologies", "Solutions",
  "Systems", "International", "Global", "Enterprises", "Partners",
  "Dynamics", "Sciences", "Networks", "Innovations", "Analytics",
  "Ventures", "Capital", "Industries", "Therapeutics", "Laboratories",
  "Semiconductor", "Biotech", "Diagnostics", "Genomics", "Devices",
  "Platforms", "Services", "Financial", "Management", "Resources",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePrice(tier: NasdaqStock["capTier"], rand: () => number): number {
  switch (tier) {
    case "mega": return 150 + rand() * 850;
    case "large": return 50 + rand() * 450;
    case "mid": return 15 + rand() * 200;
    case "small": return 3 + rand() * 80;
    case "micro": return 0.5 + rand() * 20;
  }
}

function generateMarketCap(tier: NasdaqStock["capTier"], rand: () => number): number {
  switch (tier) {
    case "mega": return (200 + rand() * 2800) * 1e9;
    case "large": return (10 + rand() * 190) * 1e9;
    case "mid": return (2 + rand() * 8) * 1e9;
    case "small": return (300 + rand() * 1700) * 1e6;
    case "micro": return (50 + rand() * 250) * 1e6;
  }
}

function generateSymbol(prefix: string, index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const suffix = letters[index % 26] + (index >= 26 ? letters[Math.floor(index / 26) % 26] : "");
  const sym = (prefix.slice(0, 2).toUpperCase() + suffix).slice(0, 5);
  return sym;
}

export function generateAllStocks(): NasdaqStock[] {
  const rand = seededRandom(42);
  const stocks: NasdaqStock[] = [];
  const usedSymbols = new Set<string>();

  for (const [symbol, name, sector, capTier] of KNOWN_STOCKS) {
    if (usedSymbols.has(symbol)) continue;
    usedSymbols.add(symbol);

    const tier = capTier as NasdaqStock["capTier"];
    const price = generatePrice(tier, rand);
    const changePct = (rand() - 0.5) * 10;
    const change = price * changePct / 100;

    stocks.push({
      symbol,
      name,
      sector,
      capTier: tier,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      volume: Math.round((tier === "mega" ? 10e6 : tier === "large" ? 3e6 : tier === "mid" ? 800000 : tier === "small" ? 200000 : 50000) * (0.5 + rand())),
      marketCap: generateMarketCap(tier, rand),
      pe: rand() > 0.15 ? Math.round((5 + rand() * 80) * 10) / 10 : null,
      week52High: Math.round(price * (1 + rand() * 0.4) * 100) / 100,
      week52Low: Math.round(price * (1 - rand() * 0.4) * 100) / 100,
    });
  }

  const TARGET = 5000;
  let genIndex = 0;

  while (stocks.length < TARGET) {
    const sectorIdx = genIndex % SECTORS.length;
    const sector = SECTORS[sectorIdx];
    const prefixes = SECTOR_PREFIXES[sector];
    const prefix = prefixes[genIndex % prefixes.length];
    const suffix = SUFFIXES[genIndex % SUFFIXES.length];

    const tierWeights = [0.02, 0.08, 0.25, 0.35, 0.30];
    const r = rand();
    let cumulative = 0;
    let tierIdx = 4;
    for (let i = 0; i < tierWeights.length; i++) {
      cumulative += tierWeights[i];
      if (r < cumulative) { tierIdx = i; break; }
    }
    const tier = CAP_TIERS[tierIdx];

    let symbol = generateSymbol(prefix, Math.floor(genIndex / SECTORS.length));
    let attempts = 0;
    while (usedSymbols.has(symbol) && attempts < 100) {
      symbol = generateSymbol(prefix + "X", Math.floor(genIndex / SECTORS.length) + attempts);
      attempts++;
    }
    if (usedSymbols.has(symbol)) { genIndex++; continue; }
    usedSymbols.add(symbol);

    const name = `${prefix}${suffix.replace(/[.]/g, "")}`;
    const price = generatePrice(tier, rand);
    const changePct = (rand() - 0.5) * 12;
    const change = price * changePct / 100;

    stocks.push({
      symbol,
      name: name.length > 40 ? name.slice(0, 40) : name,
      sector,
      capTier: tier,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      volume: Math.round((tier === "mega" ? 10e6 : tier === "large" ? 3e6 : tier === "mid" ? 800000 : tier === "small" ? 200000 : 50000) * (0.3 + rand())),
      marketCap: generateMarketCap(tier, rand),
      pe: rand() > 0.2 ? Math.round((5 + rand() * 80) * 10) / 10 : null,
      week52High: Math.round(price * (1 + rand() * 0.4) * 100) / 100,
      week52Low: Math.round(price * (1 - rand() * 0.4) * 100) / 100,
    });

    genIndex++;
  }

  return stocks;
}

let _cachedStocks: NasdaqStock[] | null = null;
let _symbolIndex: Map<string, NasdaqStock> | null = null;
let _prefixIndex: Map<string, NasdaqStock[]> | null = null;
// Pre-built lookup maps for O(1) filter access instead of O(n) array scan
let _sectorIndex: Map<string, NasdaqStock[]> | null = null;
let _capTierIndex: Map<string, NasdaqStock[]> | null = null;
// Pre-sorted by changePercent for fast movers queries
let _sortedByChange: NasdaqStock[] | null = null;
// Pre-computed sector summary (static per server lifetime)
let _sectorSummary: { sector: string; count: number; avgChange: number }[] | null = null;
// Pre-sorted arrays keyed by "field:dir" for O(1) sort access on browse requests
let _sortedIndex: Map<string, NasdaqStock[]> | null = null;

const SORT_FIELDS = ["symbol", "name", "price", "changePercent", "volume", "marketCap"] as const;
type SortField = typeof SORT_FIELDS[number];

export function getAllStocks(): NasdaqStock[] {
  if (!_cachedStocks) {
    _cachedStocks = generateAllStocks();
    _buildIndexes(_cachedStocks);
  }
  return _cachedStocks;
}

function _buildIndexes(stocks: NasdaqStock[]): void {
  _symbolIndex = new Map();
  _prefixIndex = new Map();
  _sectorIndex = new Map();
  _capTierIndex = new Map();

  const sectorSummaryMap: Record<string, { count: number; totalChange: number }> = {};

  for (const stock of stocks) {
    _symbolIndex.set(stock.symbol, stock);

    // Sector index
    if (!_sectorIndex.has(stock.sector)) _sectorIndex.set(stock.sector, []);
    _sectorIndex.get(stock.sector)!.push(stock);

    // Cap tier index
    if (!_capTierIndex.has(stock.capTier)) _capTierIndex.set(stock.capTier, []);
    _capTierIndex.get(stock.capTier)!.push(stock);

    // Sector summary accumulator
    if (!sectorSummaryMap[stock.sector]) sectorSummaryMap[stock.sector] = { count: 0, totalChange: 0 };
    sectorSummaryMap[stock.sector].count++;
    sectorSummaryMap[stock.sector].totalChange += stock.changePercent;

    // Prefix search index
    const symUpper = stock.symbol.toUpperCase();
    const nameUpper = stock.name.toUpperCase();

    for (let len = 1; len <= symUpper.length; len++) {
      const prefix = symUpper.slice(0, len);
      if (!_prefixIndex.has(prefix)) _prefixIndex.set(prefix, []);
      _prefixIndex.get(prefix)!.push(stock);
    }

    const nameWords = nameUpper.split(/\s+/);
    for (const word of nameWords) {
      for (let len = 1; len <= Math.min(word.length, 8); len++) {
        const prefix = word.slice(0, len);
        if (!_prefixIndex.has(prefix)) _prefixIndex.set(prefix, []);
        const arr = _prefixIndex.get(prefix)!;
        if (!arr.includes(stock)) arr.push(stock);
      }
    }
  }

  // Pre-sort by changePercent for movers (static data, computed once)
  _sortedByChange = [...stocks].sort((a, b) => b.changePercent - a.changePercent);

  // Pre-sort for all sort fields/directions so browse requests never sort at query time
  _sortedIndex = new Map();
  for (const field of SORT_FIELDS) {
    const asc = [...stocks].sort((a, b) => {
      const av = a[field], bv = b[field];
      return typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
    });
    _sortedIndex.set(`${field}:asc`, asc);
    _sortedIndex.set(`${field}:desc`, [...asc].reverse());
  }

  // Pre-compute sector summary
  _sectorSummary = Object.entries(sectorSummaryMap).map(([sector, data]) => ({
    sector,
    count: data.count,
    avgChange: Math.round(data.totalChange / data.count * 100) / 100,
  }));
}

/**
 * Returns the pre-sorted full stock list for a given sort field and direction.
 * Avoids any per-request sort — O(1) lookup into pre-built sorted arrays.
 */
export function getSortedStocks(sortBy: SortField = "symbol", sortDir: "asc" | "desc" = "asc"): NasdaqStock[] {
  getAllStocks();
  return _sortedIndex!.get(`${sortBy}:${sortDir}`) ?? _cachedStocks!;
}

/**
 * Returns stocks filtered by sector and/or capTier using pre-built index maps.
 * Avoids scanning the full 5,000-item array on every request.
 */
export function getFilteredStocks(sector?: string, capTier?: string): NasdaqStock[] {
  // Ensure indexes are built
  getAllStocks();

  if (!sector && !capTier) return _cachedStocks!;

  if (sector && capTier) {
    const bySector = _sectorIndex!.get(sector) ?? [];
    return bySector.filter(s => s.capTier === capTier);
  }

  if (sector) return _sectorIndex!.get(sector) ?? [];
  if (capTier) return _capTierIndex!.get(capTier) ?? [];
  return _cachedStocks!;
}

export function searchStocks(query: string, limit = 50): NasdaqStock[] {
  const q = query.toUpperCase().trim();
  if (!q) return [];

  const all = getAllStocks();

  if (_prefixIndex) {
    const candidates = _prefixIndex.get(q);
    if (candidates) {
      return candidates.slice(0, limit);
    }
    const results: NasdaqStock[] = [];
    for (const stock of all) {
      if (stock.symbol.toUpperCase().includes(q) || stock.name.toUpperCase().includes(q)) {
        results.push(stock);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  const results: NasdaqStock[] = [];
  for (const stock of all) {
    if (stock.symbol.includes(q) || stock.name.toUpperCase().includes(q)) {
      results.push(stock);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function getStockBySymbol(symbol: string): NasdaqStock | undefined {
  getAllStocks();
  return _symbolIndex?.get(symbol.toUpperCase());
}

export function getStocksBySector(sector: string): NasdaqStock[] {
  getAllStocks();
  return _sectorIndex?.get(sector) ?? [];
}

export function getTopMovers(count = 20): { gainers: NasdaqStock[]; losers: NasdaqStock[] } {
  getAllStocks();
  const sorted = _sortedByChange!;
  return {
    gainers: sorted.slice(0, count),
    losers: sorted.slice(-count).reverse(),
  };
}

export function getAllSymbols(): Set<string> {
  return new Set(KNOWN_STOCKS.map(([symbol]) => symbol));
}

export interface CryptoAsset {
  symbol: string;
  name: string;
  sector: string;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: "BTC/USD", name: "Bitcoin", sector: "Cryptocurrency" },
  { symbol: "ETH/USD", name: "Ethereum", sector: "Cryptocurrency" },
  { symbol: "SOL/USD", name: "Solana", sector: "Cryptocurrency" },
  { symbol: "XRP/USD", name: "Ripple", sector: "Cryptocurrency" },
  { symbol: "DOGE/USD", name: "Dogecoin", sector: "Cryptocurrency" },
  { symbol: "AVAX/USD", name: "Avalanche", sector: "Cryptocurrency" },
  { symbol: "LINK/USD", name: "Chainlink", sector: "Cryptocurrency" },
  { symbol: "DOT/USD", name: "Polkadot", sector: "Cryptocurrency" },
  { symbol: "LTC/USD", name: "Litecoin", sector: "Cryptocurrency" },
  { symbol: "UNI/USD", name: "Uniswap", sector: "Cryptocurrency" },
  { symbol: "ADA/USD", name: "Cardano", sector: "Cryptocurrency" },
  { symbol: "MATIC/USD", name: "Polygon", sector: "Cryptocurrency" },
  { symbol: "SHIB/USD", name: "Shiba Inu", sector: "Cryptocurrency" },
  { symbol: "BCH/USD", name: "Bitcoin Cash", sector: "Cryptocurrency" },
  { symbol: "AAVE/USD", name: "Aave", sector: "Cryptocurrency" },
];

export function getAllCryptoSymbols(): Set<string> {
  return new Set(CRYPTO_ASSETS.map(a => a.symbol));
}

export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes("/");
}

export function getSectorSummary(): { sector: string; count: number; avgChange: number }[] {
  getAllStocks();
  return _sectorSummary!;
}
