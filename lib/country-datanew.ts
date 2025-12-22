// country-data.ts
export interface Bank {
  name: string;
  swift: string; // ISO20022 / SWIFT code
}

export interface Country {
  name: string;
  code: string; // code ISO 3166-1 alpha-2
  currency: string;
  piToLocalRate: number; // conversion Pi -> local currency
  dialCode: string; // préfixe téléphone
  banks: Bank[];
}

export const countries: Country[] = [
  { name: "Afghanistan", code: "AF", currency: "AFN", piToLocalRate: 90, dialCode: "+93", banks: [{ name: "Afghan United Bank", swift: "AUBKAFGH" }, { name: "Azizi Bank", swift: "AZIZAFGH" }] },
  { name: "Albania", code: "AL", currency: "ALL", piToLocalRate: 110, dialCode: "+355", banks: [{ name: "Raiffeisen Bank Albania", swift: "RZBAALAA" }, { name: "Banka Kombetare Tregtare", swift: "BKTBALAA" }] },
  { name: "Algeria", code: "DZ", currency: "DZD", piToLocalRate: 150, dialCode: "+213", banks: [{ name: "Banque Nationale d'Algérie", swift: "BNAADZAL" }, { name: "Banque Extérieure d'Algérie", swift: "BEAADZAL" }] },
  { name: "Andorra", code: "AD", currency: "EUR", piToLocalRate: 0.93, dialCode: "+376", banks: [{ name: "Andbank", swift: "ANDBADAD" }, { name: "Crèdit Andorrà", swift: "CRANADAD" }] },
  { name: "Angola", code: "AO", currency: "AOA", piToLocalRate: 900, dialCode: "+244", banks: [{ name: "Banco Angolano de Investimentos", swift: "BAIAAOAO" }, { name: "Banco BIC", swift: "BICLAOAO" }] },
  { name: "Antigua and Barbuda", code: "AG", currency: "XCD", piToLocalRate: 2.7, dialCode: "+1", banks: [{ name: "Antigua Commercial Bank", swift: "ACBAGAGG" }, { name: "Eastern Caribbean Amalgamated Bank", swift: "ECABAGAG" }] },
  { name: "Argentina", code: "AR", currency: "ARS", piToLocalRate: 230, dialCode: "+54", banks: [{ name: "Banco de la Nación Argentina", swift: "BNAARAAA" }, { name: "Banco Santander Río", swift: "BSCHARBA" }] },
  { name: "Armenia", code: "AM", currency: "AMD", piToLocalRate: 400, dialCode: "+374", banks: [{ name: "Ameriabank", swift: "AMERAMAM" }, { name: "Ardshinbank", swift: "ARDBAMAM" }] },
  { name: "Australia", code: "AU", currency: "AUD", piToLocalRate: 1.48, dialCode: "+61", banks: [{ name: "Commonwealth Bank", swift: "CTBAAU2S" }, { name: "ANZ", swift: "ANZBAU3M" }] },
  { name: "Austria", code: "AT", currency: "EUR", piToLocalRate: 0.93, dialCode: "+43", banks: [{ name: "Raiffeisen Bank International", swift: "RZBAATWW" }, { name: "Erste Bank", swift: "GIBAATWW" }] },
  { name: "Azerbaijan", code: "AZ", currency: "AZN", piToLocalRate: 1.7, dialCode: "+994", banks: [{ name: "International Bank of Azerbaijan", swift: "IBAIAZAZ" }, { name: "Kapital Bank", swift: "KAPB AZ 2A" }] },
  { name: "Bahamas", code: "BS", currency: "BSD", piToLocalRate: 1, dialCode: "+1", banks: [{ name: "Royal Bank of Canada (Bahamas)", swift: "ROYBBSBS" }, { name: "Scotiabank Bahamas", swift: "NOSCBSBS" }] },
  { name: "Bahrain", code: "BH", currency: "BHD", piToLocalRate: 0.38, dialCode: "+973", banks: [{ name: "Ahli United Bank", swift: "AHUBBHBA" }, { name: "Bahrain Islamic Bank", swift: "BIBBBHBH" }] },
  { name: "Bangladesh", code: "BD", currency: "BDT", piToLocalRate: 108, dialCode: "+880", banks: [{ name: "BRAC Bank", swift: "BRACBDDH" }, { name: "Dutch-Bangla Bank", swift: "DBBLBDDH" }] },
  { name: "Barbados", code: "BB", currency: "BBD", piToLocalRate: 2, dialCode: "+1", banks: [{ name: "Barclays Bank", swift: "BARCBBXX" }, { name: "FirstCaribbean International Bank", swift: "FCIBBBBX" }] },
  { name: "Belarus", code: "BY", currency: "BYN", piToLocalRate: 2.5, dialCode: "+375", banks: [{ name: "Belarusbank", swift: "BELBBY2X" }, { name: "Priorbank", swift: "PRIORBY2" }] },
  { name: "Belgium", code: "BE", currency: "EUR", piToLocalRate: 0.93, dialCode: "+32", banks: [{ name: "KBC Bank", swift: "KREDBEBB" }, { name: "BNP Paribas Fortis", swift: "GEBABEBB" }] },
  { name: "Belize", code: "BZ", currency: "BZD", piToLocalRate: 2, dialCode: "+501", banks: [{ name: "Belize Bank", swift: "BELBBZBZ" }, { name: "Scotiabank Belize", swift: "NOSCBZBZ" }] },
  { name: "Benin", code: "BJ", currency: "XOF", piToLocalRate: 615, dialCode: "+229", banks: [{ name: "Bank of Africa", swift: "BOABBJBB" }, { name: "Ecobank Benin", swift: "ECOBBJBB" }] },
  { name: "Bhutan", code: "BT", currency: "BTN", piToLocalRate: 82, dialCode: "+975", banks: [{ name: "Bank of Bhutan", swift: "BOBBBTBT" }, { name: "Royal Monetary Authority", swift: "RMAABTBT" }] },
  { name: "Bolivia", code: "BO", currency: "BOB", piToLocalRate: 6.9, dialCode: "+591", banks: [{ name: "Banco Nacional de Bolivia", swift: "BNBOBOBO" }, { name: "Banco Mercantil Santa Cruz", swift: "BMSCBOBO" }] },
  { name: "Bosnia and Herzegovina", code: "BA", currency: "BAM", piToLocalRate: 1.83, dialCode: "+387", banks: [{ name: "Raiffeisen Bank", swift: "RZBABA2X" }, { name: "UniCredit Bank", swift: "BACBBA2X" }] },
  { name: "Botswana", code: "BW", currency: "BWP", piToLocalRate: 12, dialCode: "+267", banks: [{ name: "Bank Gaborone", swift: "BGBWBWBW" }, { name: "First National Bank Botswana", swift: "FNBWBWBW" }] },
  { name: "Brazil", code: "BR", currency: "BRL", piToLocalRate: 5.1, dialCode: "+55", banks: [{ name: "Banco do Brasil", swift: "BRASBRRJBHE" }, { name: "Itaú Unibanco", swift: "ITAUBRRJ" }] },
  { name: "Brunei", code: "BN", currency: "BND", piToLocalRate: 1.36, dialCode: "+673", banks: [{ name: "Baiduri Bank", swift: "BAIDBNBB" }, { name: "Bank Islam Brunei", swift: "BIBBBNBB" }] },
  { name: "Bulgaria", code: "BG", currency: "BGN", piToLocalRate: 1.8, dialCode: "+359", banks: [{ name: "UniCredit Bulbank", swift: "UNCRBGSF" }, { name: "DSK Bank", swift: "DSKBBGSF" }] },
  { name: "Burkina Faso", code: "BF", currency: "XOF", piToLocalRate: 615, dialCode: "+226", banks: [{ name: "Bank of Africa", swift: "BOABBFBB" }, { name: "Ecobank Burkina Faso", swift: "ECOBBFBB" }] },
  { name: "Burundi", code: "BI", currency: "BIF", piToLocalRate: 2100, dialCode: "+257", banks: [{ name: "Banque de Crédit de Bujumbura", swift: "BCBBIBBI" }, { name: "Banque Commerciale du Burundi", swift: "BANCBIBI" }] },
  { name: "Cabo Verde", code: "CV", currency: "CVE", piToLocalRate: 100, dialCode: "+238", banks: [{ name: "Banco Comercial do Atlântico", swift: "BCACCVVV" }, { name: "Banco Interatlântico", swift: "BIACCVVV" }] },
  { name: "Cambodia", code: "KH", currency: "KHR", piToLocalRate: 4100, dialCode: "+855", banks: [{ name: "ACLEDA Bank", swift: "ACLEDKHH" }, { name: "Canadia Bank", swift: "CANDKHKH" }] },
  { name: "Cameroon", code: "CM", currency: "XAF", piToLocalRate: 610, dialCode: "+237", banks: [{ name: "Afriland First Bank", swift: "AFIBCMCM" }, { name: "Commercial Bank Cameroon", swift: "CBCCMCM" }] },
  { name: "Canada", code: "CA", currency: "CAD", piToLocalRate: 1.34, dialCode: "+1", banks: [{ name: "Royal Bank of Canada", swift: "ROYCCAT2" }, { name: "TD Canada Trust", swift: "TDOMCATTTOR" }] },
  { name: "Central African Republic", code: "CF", currency: "XAF", piToLocalRate: 610, dialCode: "+236", banks: [{ name: "BGFIBank CAR", swift: "BGFICF" }, { name: "Ecobank CAR", swift: "ECOBCFBB" }] },
  { name: "Chad", code: "TD", currency: "XAF", piToLocalRate: 610, dialCode: "+235", banks: [{ name: "Bank of Africa Chad", swift: "BOACTD" }, { name: "Ecobank Chad", swift: "ECOBCTD" }] },
  { name: "Chile", code: "CL", currency: "CLP", piToLocalRate: 890, dialCode: "+56", banks: [{ name: "Banco de Chile", swift: "CHCLCLCL" }, { name: "Banco Santander Chile", swift: "BSCHCLCL" }] },
  { name: "China", code: "CN", currency: "CNY", piToLocalRate: 7.2, dialCode: "+86", banks: [{ name: "Industrial and Commercial Bank of China", swift: "ICBKCNBJ" }, { name: "Bank of China", swift: "BKCHCNBJ" }] },
  { name: "Colombia", code: "CO", currency: "COP", piToLocalRate: 4500, dialCode: "+57", banks: [{ name: "Bancolombia", swift: "COLOCOBM" }, { name: "Banco de Bogotá", swift: "BOGBCOBB" }] },
  { name: "Comoros", code: "KM", currency: "KMF", piToLocalRate: 460, dialCode: "+269", banks: [{ name: "Banque de Comores", swift: "BDCOMKOM" }, { name: "Exim Bank Comoros", swift: "EXCOKOMX" }] },
  { name: "Congo (Brazzaville)", code: "CG", currency: "XAF", piToLocalRate: 610, dialCode: "+242", banks: [{ name: "BGFIBank Congo", swift: "BGFICG" }, { name: "Ecobank Congo", swift: "ECOBCG" }] },
  { name: "Congo (DRC)", code: "CD", currency: "CDF", piToLocalRate: 2500, dialCode: "+243", banks: [{ name: "Rawbank", swift: "RAWBCDCX" }, { name: "Trust Merchant Bank", swift: "TMBRCDNX" }] },
  { name: "Costa Rica", code: "CR", currency: "CRC", piToLocalRate: 550, dialCode: "+506", banks: [{ name: "Banco Nacional de Costa Rica", swift: "BNCRCRCR" }, { name: "Banco de Costa Rica", swift: "BCRICRCR" }] },
  { name: "Croatia", code: "HR", currency: "HRK", piToLocalRate: 6.9, dialCode: "+385", banks: [{ name: "Zagrebačka banka", swift: "ZABAHR2X" }, { name: "Privredna banka Zagreb", swift: "PBZGHR2X" }] },
  { name: "Cuba", code: "CU", currency: "CUP", piToLocalRate: 24, dialCode: "+53", banks: [{ name: "Banco Metropolitano", swift: "BMETCUHH" }, { name: "Banco de Crédito y Comercio", swift: "BCCRCUHH" }] },
  { name: "Cyprus", code: "CY", currency: "EUR", piToLocalRate: 0.93, dialCode: "+357", banks: [{ name: "Bank of Cyprus", swift: "BCYPCY2N" }, { name: "Hellenic Bank", swift: "HBLBCY2N" }] },
  { name: "Czech Republic", code: "CZ", currency: "CZK", piToLocalRate: 23.5, dialCode: "+420", banks: [{ name: "Česká spořitelna", swift: "GIBACZPX" }, { name: "Komerční banka", swift: "KOMBCZPP" }] }
];
// suite de country-data.ts (Pays 51 à 195)

countries.push(
  { name: "Denmark", code: "DK", currency: "DKK", piToLocalRate: 6.8, dialCode: "+45", banks: [{ name: "Danske Bank", swift: "DABADKKK" }, { name: "Nordea Bank", swift: "NDEADKKK" }] },
  { name: "Djibouti", code: "DJ", currency: "DJF", piToLocalRate: 200, dialCode: "+253", banks: [{ name: "Banque de Djibouti", swift: "BDJBJDJ" }, { name: "Bank of Africa Djibouti", swift: "BOADJDJ" }] },
  { name: "Dominica", code: "DM", currency: "XCD", piToLocalRate: 2.7, dialCode: "+1", banks: [{ name: "Commonwealth Bank Dominica", swift: "CMDMDMDM" }, { name: "Scotiabank Dominica", swift: "NOSCDMMD" }] },
  { name: "Dominican Republic", code: "DO", currency: "DOP", piToLocalRate: 55, dialCode: "+1", banks: [{ name: "Banco Popular Dominicano", swift: "BPDODOCX" }, { name: "Banreservas", swift: "BSRDDO22" }] },
  { name: "Ecuador", code: "EC", currency: "USD", piToLocalRate: 1, dialCode: "+593", banks: [{ name: "Banco Pichincha", swift: "BPICECQX" }, { name: "Produbanco", swift: "PRODECEQ" }] },
  { name: "Egypt", code: "EG", currency: "EGP", piToLocalRate: 30, dialCode: "+20", banks: [{ name: "National Bank of Egypt", swift: "NBEGEGCX" }, { name: "Banque Misr", swift: "BMISEGCX" }] },
  { name: "El Salvador", code: "SV", currency: "USD", piToLocalRate: 1, dialCode: "+503", banks: [{ name: "Banco Agricola", swift: "BAGRSVSS" }, { name: "Banco Cuscatlan", swift: "BCUSSVSS" }] },
  { name: "Equatorial Guinea", code: "GQ", currency: "XAF", piToLocalRate: 610, dialCode: "+240", banks: [{ name: "BGFIBank GQ", swift: "BGFIGQ" }, { name: "Calyon Bank", swift: "CALYGQ" }] },
  { name: "Eritrea", code: "ER", currency: "ERN", piToLocalRate: 15, dialCode: "+291", banks: [{ name: "Commercial Bank of Eritrea", swift: "CBEERETR" }, { name: "Zemen Bank", swift: "ZMBERETR" }] },
  { name: "Estonia", code: "EE", currency: "EUR", piToLocalRate: 0.93, dialCode: "+372", banks: [{ name: "Swedbank Estonia", swift: "HABAEE2X" }, { name: "SEB Estonia", swift: "ESSEEE2X" }] },
  { name: "Eswatini", code: "SZ", currency: "SZL", piToLocalRate: 19, dialCode: "+268", banks: [{ name: "Eswatini Bank", swift: "ESWBSZ22" }, { name: "Standard Bank Eswatini", swift: "SBZLSZ22" }] },
  { name: "Ethiopia", code: "ET", currency: "ETB", piToLocalRate: 55, dialCode: "+251", banks: [{ name: "Commercial Bank of Ethiopia", swift: "CBETETAA" }, { name: "Awash Bank", swift: "AWSETAA" }] },
  { name: "Fiji", code: "FJ", currency: "FJD", piToLocalRate: 2.3, dialCode: "+679", banks: [{ name: "ANZ Fiji", swift: "ANZBFJFJ" }, { name: "Westpac Fiji", swift: "WPACFJFJ" }] },
  { name: "Finland", code: "FI", currency: "EUR", piToLocalRate: 0.93, dialCode: "+358", banks: [{ name: "Nordea Finland", swift: "NDEAFIHH" }, { name: "OP Financial Group", swift: "OKOYFIHH" }] },
  { name: "France", code: "FR", currency: "EUR", piToLocalRate: 0.93, dialCode: "+33", banks: [{ name: "BNP Paribas", swift: "BNPAFRPP" }, { name: "Société Générale", swift: "SOGEFRPP" }] },
  { name: "Gabon", code: "GA", currency: "XAF", piToLocalRate: 610, dialCode: "+241", banks: [{ name: "BGFIBank Gabon", swift: "BGFIGA" }, { name: "Ecobank Gabon", swift: "ECOBGA" }] },
  { name: "Gambia", code: "GM", currency: "GMD", piToLocalRate: 60, dialCode: "+220", banks: [{ name: "Gambia Commercial Bank", swift: "GCBGMGGG" }, { name: "Trust Bank", swift: "TRUBGMGG" }] },
  { name: "Georgia", code: "GE", currency: "GEL", piToLocalRate: 2.7, dialCode: "+995", banks: [{ name: "TBC Bank", swift: "TBCBGE22" }, { name: "Bank of Georgia", swift: "BOGAGE22" }] },
  { name: "Germany", code: "DE", currency: "EUR", piToLocalRate: 0.93, dialCode: "+49", banks: [{ name: "Deutsche Bank", swift: "DEUTDEFF" }, { name: "Commerzbank", swift: "COBADEFF" }] },
  { name: "Ghana", code: "GH", currency: "GHS", piToLocalRate: 12, dialCode: "+233", banks: [{ name: "Ghana Commercial Bank", swift: "GHCBGHAC" }, { name: "Ecobank Ghana", swift: "ECOBGHAC" }] },
  { name: "Greece", code: "GR", currency: "EUR", piToLocalRate: 0.93, dialCode: "+30", banks: [{ name: "National Bank of Greece", swift: "ETHNGRAA" }, { name: "Alpha Bank", swift: "CRBAGRAA" }] },
  { name: "Grenada", code: "GD", currency: "XCD", piToLocalRate: 2.7, dialCode: "+1", banks: [{ name: "Grenada Co-operative Bank", swift: "GCBGGDGD" }, { name: "Republic Bank Grenada", swift: "RBGGGDGD" }] },
  { name: "Guatemala", code: "GT", currency: "GTQ", piToLocalRate: 7.8, dialCode: "+502", banks: [{ name: "Banco Industrial", swift: "BINDGTGT" }, { name: "Banco G&T Continental", swift: "BGTGGTGT" }] },
  { name: "Guinea", code: "GN", currency: "GNF", piToLocalRate: 9500, dialCode: "+224", banks: [{ name: "Banque Centrale de la République de Guinée", swift: "BCRGGN" }, { name: "Guinea Commercial Bank", swift: "GCBGGN" }] },
  { name: "Guinea-Bissau", code: "GW", currency: "XOF", piToLocalRate: 615, dialCode: "+245", banks: [{ name: "Banco da Bissau", swift: "BDBGWGW" }, { name: "Ecobank Guinea-Bissau", swift: "ECOBGWGW" }] },
  { name: "Guyana", code: "GY", currency: "GYD", piToLocalRate: 210, dialCode: "+592", banks: [{ name: "Republic Bank Guyana", swift: "RBGGYGGY" }, { name: "Bank of Guyana", swift: "BOGGYGGY" }] },
  { name: "Haiti", code: "HT", currency: "HTG", piToLocalRate: 100, dialCode: "+509", banks: [{ name: "Société Générale Haïtienne de Banque", swift: "SGHBHTHT" }, { name: "Unibank", swift: "UNIBHTHT" }] },
  { name: "Honduras", code: "HN", currency: "HNL", piToLocalRate: 24, dialCode: "+504", banks: [{ name: "Banco Ficohsa", swift: "FICOHNHH" }, { name: "Banco Atlántida", swift: "BANTHNHH" }] },
  { name: "Hungary", code: "HU", currency: "HUF", piToLocalRate: 350, dialCode: "+36", banks: [{ name: "OTP Bank", swift: "OTPVBHUH" }, { name: "Erste Bank Hungary", swift: "GIBAHUHB" }] },
  { name: "Iceland", code: "IS", currency: "ISK", piToLocalRate: 140, dialCode: "+354", banks: [{ name: "Landsbankinn", swift: "GLITISRE" }, { name: "Arion Bank", swift: "ARIONISX" }] },
  { name: "India", code: "IN", currency: "INR", piToLocalRate: 82, dialCode: "+91", banks: [{ name: "State Bank of India", swift: "SBININBB" }, { name: "HDFC Bank", swift: "HDFCINBB" }] },
  { name: "Indonesia", code: "ID", currency: "IDR", piToLocalRate: 15000, dialCode: "+62", banks: [{ name: "Bank Central Asia", swift: "CENAIDJA" }, { name: "Bank Mandiri", swift: "BMRIIDJA" }] },
  { name: "Iran", code: "IR", currency: "IRR", piToLocalRate: 42000, dialCode: "+98", banks: [{ name: "Bank Melli Iran", swift: "BAMIIRIR" }, { name: "Tejarat Bank", swift: "TEJIRIRR" }] },
  { name: "Iraq", code: "IQ", currency: "IQD", piToLocalRate: 1500, dialCode: "+964", banks: [{ name: "Rafidain Bank", swift: "RFIDIQBA" }, { name: "Trade Bank of Iraq", swift: "TBIQIQBA" }] },
  { name: "Ireland", code: "IE", currency: "EUR", piToLocalRate: 0.93, dialCode: "+353", banks: [{ name: "Bank of Ireland", swift: "BOFIIE2D" }, { name: "Allied Irish Banks", swift: "AIBKIE2D" }] },
  { name: "Israel", code: "IL", currency: "ILS", piToLocalRate: 3.6, dialCode: "+972", banks: [{ name: "Bank Hapoalim", swift: "POALILIT" }, { name: "Bank Leumi", swift: "LUMIILIT" }] },
  { name: "Italy", code: "IT", currency: "EUR", piToLocalRate: 0.93, dialCode: "+39", banks: [{ name: "UniCredit", swift: "UNCRITMM" }, { name: "Intesa Sanpaolo", swift: "BCITITMM" }] }
);
// suite finale de country-data.ts (Pays 196 à 195)
countries.push(
  { name: "Jamaica", code: "JM", currency: "JMD", piToLocalRate: 160, dialCode: "+1", banks: [{ name: "National Commercial Bank Jamaica", swift: "NCBJJMKN" }, { name: "Scotiabank Jamaica", swift: "NOSCJMKN" }] },
  { name: "Japan", code: "JP", currency: "JPY", piToLocalRate: 147, dialCode: "+81", banks: [{ name: "Mitsubishi UFJ Bank", swift: "BOTKJPJT" }, { name: "Sumitomo Mitsui Banking Corporation", swift: "SMBCJPJT" }] },
  { name: "Jordan", code: "JO", currency: "JOD", piToLocalRate: 0.71, dialCode: "+962", banks: [{ name: "Arab Bank", swift: "ARABJOAX" }, { name: "Jordan Ahli Bank", swift: "JAHLIJOA" }] },
  { name: "Kazakhstan", code: "KZ", currency: "KZT", piToLocalRate: 470, dialCode: "+7", banks: [{ name: "Halyk Bank", swift: "HSBKKZKA" }, { name: "Kazkommertsbank", swift: "KZKOKZKA" }] },
  { name: "Kenya", code: "KE", currency: "KES", piToLocalRate: 140, dialCode: "+254", banks: [{ name: "Equity Bank", swift: "EQBLKENX" }, { name: "KCB Bank", swift: "KCBLKENX" }] },
  { name: "Kiribati", code: "KI", currency: "AUD", piToLocalRate: 1.5, dialCode: "+686", banks: [{ name: "Kiribati National Bank", swift: "KNBKI" }] },
  { name: "Kuwait", code: "KW", currency: "KWD", piToLocalRate: 0.28, dialCode: "+965", banks: [{ name: "National Bank of Kuwait", swift: "NBOKKWKW" }, { name: "Gulf Bank", swift: "GULFKWKW" }] },
  { name: "Kyrgyzstan", code: "KG", currency: "KGS", piToLocalRate: 90, dialCode: "+996", banks: [{ name: "Optima Bank", swift: "OPTIKG" }, { name: "Demir Bank", swift: "DEMIRKG" }] },
  { name: "Laos", code: "LA", currency: "LAK", piToLocalRate: 17750, dialCode: "+856", banks: [{ name: "Banque Pour Le Commerce Exterieur Lao", swift: "BCELLA" }, { name: "Acleda Bank Laos", swift: "ACEDLA" }] },
  { name: "Latvia", code: "LV", currency: "EUR", piToLocalRate: 0.93, dialCode: "+371", banks: [{ name: "Swedbank Latvia", swift: "HABALV22" }, { name: "SEB Latvia", swift: "UNLALV2X" }] },
  { name: "Lebanon", code: "LB", currency: "LBP", piToLocalRate: 1500, dialCode: "+961", banks: [{ name: "Bank Audi", swift: "AUDBLBBX" }, { name: "SGBL", swift: "SGEBLBBX" }] },
  { name: "Lesotho", code: "LS", currency: "LSL", piToLocalRate: 19, dialCode: "+266", banks: [{ name: "Standard Lesotho Bank", swift: "STANLS22" }, { name: "Nedbank Lesotho", swift: "NEDBLS22" }] },
  { name: "Liberia", code: "LR", currency: "LRD", piToLocalRate: 160, dialCode: "+231", banks: [{ name: "Liberia Bank for Development and Investment", swift: "LBDILR" }, { name: "Ecobank Liberia", swift: "ECOBLR" }] },
  { name: "Libya", code: "LY", currency: "LYD", piToLocalRate: 1.5, dialCode: "+218", banks: [{ name: "Central Bank of Libya", swift: "CBLYLY" }, { name: "Banque Libyenne de Commerce", swift: "BLCILY" }] },
  { name: "Liechtenstein", code: "LI", currency: "CHF", piToLocalRate: 0.86, dialCode: "+423", banks: [{ name: "Liechtensteinische Landesbank", swift: "LLBLLI2X" }, { name: "VP Bank", swift: "VPBILI2X" }] },
  { name: "Lithuania", code: "LT", currency: "EUR", piToLocalRate: 0.93, dialCode: "+370", banks: [{ name: "Swedbank Lithuania", swift: "HABALT22" }, { name: "SEB Lithuania", swift: "CBVILT2X" }] },
  { name: "Luxembourg", code: "LU", currency: "EUR", piToLocalRate: 0.93, dialCode: "+352", banks: [{ name: "Banque et Caisse d'Épargne de l'État", swift: "BCEE LU LX" }, { name: "BGL BNP Paribas", swift: "BGLLLULL" }] },
  { name: "Madagascar", code: "MG", currency: "MGA", piToLocalRate: 4400, dialCode: "+261", banks: [{ name: "BFV-SG", swift: "BFVSMGMG" }, { name: "Bank of Africa Madagascar", swift: "BOAMGGMG" }] },
  { name: "Malawi", code: "MW", currency: "MWK", piToLocalRate: 1100, dialCode: "+265", banks: [{ name: "National Bank of Malawi", swift: "NABLMWMW" }, { name: "FDH Bank", swift: "FDHLMWMW" }] },
  { name: "Malaysia", code: "MY", currency: "MYR", piToLocalRate: 4.6, dialCode: "+60", banks: [{ name: "Maybank", swift: "MBBEMYKL" }, { name: "CIMB Bank", swift: "CIBBMYKL" }] },
  { name: "Maldives", code: "MV", currency: "MVR", piToLocalRate: 15, dialCode: "+960", banks: [{ name: "Bank of Maldives", swift: "BOMVMVMV" }] },
  { name: "Mali", code: "ML", currency: "XOF", piToLocalRate: 615, dialCode: "+223", banks: [{ name: "Banque Internationale pour le Commerce et l'Industrie du Mali", swift: "BICIMLMX" }, { name: "BMS-SA", swift: "BMSMLMLM" }] },
  { name: "Malta", code: "MT", currency: "EUR", piToLocalRate: 0.93, dialCode: "+356", banks: [{ name: "Bank of Valletta", swift: "BVLLMTMT" }, { name: "HSBC Malta", swift: "HSBCMTMT" }] },
  { name: "Marshall Islands", code: "MH", currency: "USD", piToLocalRate: 1, dialCode: "+692", banks: [{ name: "Bank of Marshall Islands", swift: "BOMIMHHH" }] },
  { name: "Mauritania", code: "MR", currency: "MRU", piToLocalRate: 36, dialCode: "+222", banks: [{ name: "Banque Mauritanienne pour le Commerce International", swift: "BMCI MR MR" }] },
  { name: "Mauritius", code: "MU", currency: "MUR", piToLocalRate: 45, dialCode: "+230", banks: [{ name: "State Bank of Mauritius", swift: "SBMAMUMU" }, { name: "Mauritius Commercial Bank", swift: "MCBAMUMU" }] },
  { name: "Mexico", code: "MX", currency: "MXN", piToLocalRate: 18, dialCode: "+52", banks: [{ name: "BBVA Mexico", swift: "BCMRMXMM" }, { name: "Banorte", swift: "GNOEMXMM" }] },
  { name: "Micronesia", code: "FM", currency: "USD", piToLocalRate: 1, dialCode: "+691", banks: [{ name: "Bank of Micronesia", swift: "BOMFMFM" }] },
  { name: "Moldova", code: "MD", currency: "MDL", piToLocalRate: 18, dialCode: "+373", banks: [{ name: "Moldova Agroindbank", swift: "MAIBMD2X" }, { name: "Moldindconbank", swift: "MICBMD2X" }] },
  { name: "Monaco", code: "MC", currency: "EUR", piToLocalRate: 0.93, dialCode: "+377", banks: [{ name: "Société Générale Monaco", swift: "SOGEMCMC" }, { name: "Crédit Foncier de Monaco", swift: "CFMCMCMM" }] },
  { name: "Mongolia", code: "MN", currency: "MNT", piToLocalRate: 3500, dialCode: "+976", banks: [{ name: "Golomt Bank", swift: "GOMOMNUB" }, { name: "Trade and Development Bank", swift: "TDBMMNUB" }] },
  { name: "Montenegro", code: "ME", currency: "EUR", piToLocalRate: 0.93, dialCode: "+382", banks: [{ name: "Crnogorska Komercijalna Banka", swift: "CKBAMEPG" }, { name: "NLB Montenegro", swift: "NLBAMEPG" }] }
);
