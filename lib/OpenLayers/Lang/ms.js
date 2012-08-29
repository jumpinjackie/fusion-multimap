/**
 * @requires OpenLayers/Lang.js
 */

/**
 * Namespace: OpenLayers.Lang["en"]
 * Dictionary for English.  Keys for entries are used in calls to
 *     <OpenLayers.Lang.translate>.  Entry bodies are normal strings or
 *     strings formatted for use with <OpenLayers.String.format> calls.
 */
OpenLayers.Lang.ms = {

    'unhandledRequest': "Permintaan pulangan tak dikendali ${statusText}",

    'Permalink': "Permalink",

    'Overlays': "Overlays",

    'Base Layer': "Lapisan asas",

    'noFID': "Tidak boleh mengemas kini ciri yang ada FID.",

    'browserNotSupported':
        "Pelayar anda tidak menyokong rendering vektor. Renderers Pada masa yang disokong adalah:\n${renderers}",

    // console message
    'minZoomLevelError':
       "Harta minZoomLevel hanya dimaksudkan untuk penggunaan" +
        "dengan lapisan-keturunan FixedZoomLevels. Bahawa" +
        "cek lapisan wfs untuk minZoomLevel adalah relik" +
        "lalu. Kita tidak boleh, bagaimanapun, keluarkan tanpa mungkin" +
        "melanggar aplikasi berasaskan OL yang mungkin bergantung kepada ia." +
        "Oleh itu kita deprecating - minZoomLevel yang" +
        "check bawah akan dikeluarkan pada 3.0. Sila bukannya" +
        "menggunakan min/max resolusi tetapan seperti yang diterangkan di sini:" +
        "http://trac.openlayers.org/wiki/SettingZoomLevels",

    'commitSuccess': "WFS Transaksi: KEJAYAAN ${response}",

    'commitFailed': "Transaksi WFS: GAGAL ${response}",

    'googleWarning':
        "Lapisan Google tidak dapat memuatkan dengan betul.<br><br>" +
        "Untuk menghilangkan mesej ini, pilih BaseLayer baru "+
        "dalam lapisan penukar di sudut atas kanan.<br><br>" +
        "Kemungkinan besar, ini adalah kerana perpustakaan Google Maps" +
        "skrip sama ada tidak termasuk atau tidak mengandungi" +
        "API kunci yang betul untuk laman web anda.<br><br>" +
        "Pemaju: Untuk bantuan ini berfungsi dengan betul," +
        "<a href='http://trac.openlayers.org/wiki/Google' " +
        "target='_blank'>klik di sini</a>",

    'getLayerWarning':
        "${layerType} Lapisan dapat memuatkan dengan betul.<br><br>" +
        "Untuk menghilangkan mesej ini, pilih BaseLayer baru" +
        "dalam lapisan penukar di sudut atas kanan.<br><br>" +
       "Kemungkinan besar, ini adalah kerana ${layerLib} perpustakaan" +
        "skrip tidak betul dimasukkan.<br><br>" +
        "Pemaju: Untuk bantuan ini berfungsi dengan betul," +
        "<a href='http://trac.openlayers.org/wiki/${layerLib}' " +
        "target='_blank'>klik di sini</a>",

    'Scale = 1 : ${scaleDenom}': "Skala = 1 : ${scaleDenom}",
    
    //labels for the graticule control
    'W': 'W',
    'E': 'E',
    'N': 'N',
    'S': 'S',
    'Graticule': 'Graticule',

    // console message
    'reprojectDeprecated':
        "Anda menggunakan 'reproject' pilihan" +
        "pada lapisan ${layerName} Pilihan ini dikecam:" +
        "penggunaannya telah direka untuk menyokong memaparkan data lebih komersial" +
        "basemaps, tetapi fungsi itu kini harus dicapai dengan menggunakan" +
        "Sfera Mercator sokongan. Maklumat lanjut boleh didapati daripada" +
        "http://trac.openlayers.org/wiki/SphericalMercator."

    // console message
    'methodDeprecated':
        "Kaedah ini telah dikecam dan akan dikeluarkan dalam 3.0." +
        "Sila gunakan ${newMethod} sebaliknya."

    'proxyNeeded': "Anda mungkin perlu untuk menetapkan OpenLayers.ProxyHost untuk mengakses ${url}." +
        "Lihat http://trac.osgeo.org/openlayers/wiki/FrequentlyAskedQuestions#ProxyHost",

    // **** end ****
    'end': ''
    
};