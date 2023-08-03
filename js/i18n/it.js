gtiz_languages.it = {
  "all" : "Tutti",
  "branch_cutoffs": "Taglio collegamenti",
  "branch_style": "Stile collegamenti",
  "category": "Categoria",
  "category2": "Categoria 2",
  "centre_tree": "Centra tree",
  "change_language": "Cambia lingua",
  "change_language_alert" : '<p><i class="iconic iconic-warning-triangle"></i> Cambiando lingua l\'applicazione subirà un reset.</p>',
  "character": "Testuale",
  "clean_selection": "Pulisci selezione",
  "collapse_branches": "Comprimi collegamenti",
  "collapse_selected_nodes": "Comprimi nodi selezionati",
  "color_by": "Colora per",
  "color_scheme": "Schema colore",
  "column_selection": "Selezione colonna",
  "crn_genome_sequencing": "CRN Sequenze Genomiche",
  "custom": "Custom",
  "data_category": "Categoria dati",
  "deselect_all": "Deseleziona tutti",
  "display": "Mostra",
  "download": "Download",
  "download_table": "Esporta tabella",
  "download_svg": "Download Svg",
  "drop_info": "Puoi anche trascinare o caricare un file .nwk seguito da un file .tsv per i metadata da associare al tree. Opzionalmente puoi trascinare o caricare un file .geojson contenente informazioni geospaziali. Puoi trovare una guida completa sul nostro <a href=\"https://genpat.izs.it/genpat_wiki/\" target=\"_blank\">wiki</a>.",
  "drop_message": "Trascina in quest'area un file .json valido oppure caricalo dal tuo computer per iniziare con GrapeTree.",
  "dropped_files_alert": "Puoi trascinare un solo file per volta: un file <strong>.json</strong> completo o in alternativa un file <strong>.nwk</strong> seguito da un file <strong>.tsv</strong> per i metadata, infine eventualmente un file <strong>.geojson</strong> per dati geospaziali.",
  "dynamic" : "Dinamico",
  "expand_all": "Espandi tutti",
  "expand_selected_nodes" : "Espandi nodi selezionati",
  "export_geoJson" : "Esporta geoJson",
  "export_metadata" : "Esporta metadata",
  "export_newick" : "Esporta newick",
  "font_size" : "Dimensione carattere",
  "for_branches_longer_than" : "Per collegamenti più lunghi di:",
  "from": "Da",
  "fullscreen": "Full screen",
  "gradient": "Gradiente caldo",
  "gradient_cool": "Gradiente freddo",
  "gradient_rainbow": "Arcobaleno",
  "gradient_rainbow2": "Arcobaleno chiaro",
  "gradient_rainbow3": "Arcobaleno scuro",
  "grapetree": "GrapeTree",
  "grapetree_tools": "Strumenti GrapeTree",
  "group_order": "Ordine gruppo",
  "heat_map_mode": "Modalità heatmap",
  "help": "Aiuto",
  "helps": {
    "tree_layout": {
      "help" : '<ul><li><strong>Tree iniziale:</strong> ricarica la pagina e riporta l\'albero allo stato e con il layout in cui si trovava quando è stato caricato la prima volta. Verrà chiesta conferma prima di abbandonare la pagina. <strong>Attenzione:</strong> l\'uso di questa funzione provocherà la perdita di tutte le modifiche effettuate.</li><li><strong>Ridisegno statico:</strong> ricarica il grafico e lo ridisegna nel layout predefinito.</li><li><strong>Centra tree:</strong> regola le impostazioni di visualizzazione per portare il centro del grafico al centro dell\'area di lavoro.</li>'
    },
    "node_style": {
      "help": '<p>Nella categoria <em>Node style</em> è possibile trovare opzioni per modificare l\'aspetto dei nodi o le relative informazioni visualizzate.</p><ul><li><strong>Colora per:</strong>dal menù a cascata di questa sezione si può selezionare il colore di riempimento dei nodi, in base ai metadati.</li><li><strong>Mostra etichette:</strong> l\'opzione permette di scegliere se visualizzare o meno le etichette dei nodi. &Egrave; anche possibile scegliere che tipo di etichetta mostrare dal menù a cascata sotto l\'interruttore <em>Show Labels</em>.</li><li><li><strong>Dimensione carattere:</strong> le dimensioni del font sono modifcabili trascinando l\'apposito cursore o specificando le dimensioni desiderate nel campo sottostante.</li><li><strong>Evidenzia etichette:</strong> usa il campo di ricerca per evidenziare i le etichette dei nodi. Sono supportate le Espressioni Regolari.</li><li><strong>Segmenti individuali:</strong> l\'interruttore di questa opzione permette di trasformare i nodi in grafici a torta, ognuno dei quali presenterà una scomposizione degli elementi in esso contenuti.</li></ul>'
    },
    "node_size": {
      "help": '<ul><li><strong>Dimensione raggio (%):</strong> la dimensione dei nodi può essere aumentata o diminuita trascinando l\'apposito cursore o specificando le dimensioni nel campo.</li><li><strong>Kurtosis (%):</strong> di base, l\'area dei nodi è correlata con il numero di elementi che ne fanno parte. Usando il cursore o il campo nella sezione <em>Kurtosis (%)</em>, le dimensioni dei nodi possono essere diminuite o aumentate sulla base della distribuzione della kurtosis dei nodi. Aumentando il valore di kurtosis, incrementa la percentuale della quale la dimensione dei nodi aumenta per ogni elemento nel nodo, permettendo quindi ai nodi con un maggior numero di membri di risaltare di più per via di un maggior aumento percentuale della loro area.</li></ul>'
    },
    "rendering": {
      "help": '<p>La sezione <em>Rendering</em> contiene delle opzioni che permettono di controllare il posizionamento dei nodi nel grafico. Sono disponibili due modalità: <em>Statico</em> e <em>Dinamico</em>.</p><ul><li><strong>Statico:</strong> in modalità <em>Statica</em> il layout dell\'albero viene calcolato alla generazione del grafico e viene mantenuto statico ma interattivo; la lunghezza relativa dei rami e la loro scala rimane statica (derivata dai dati del grafico originale) e viene sempre mantenuta fintanto che l\'opzione <strong>Real Branch Lenght</strong> rimane selezionata.</li><li><strong>Dinamico:</strong> i nodi vengono posizionati dinamicamente in maniera simile ad una modalità <a href="https://gist.github.com/mbostock/4062045" target="_blank">Force Directed Layout</a>, ma tenteranno di sparpagliarsi per distanziarsi dai nodi vicini. In questa modalità l\'albero può essere spostato liberamente, trascinandolo con il mouse; i nodi si ridisporranno sempre automaticamente per mantenere le distanze dai nodi circostanti, a seguito dello spostamento. La modalità dinamica può essere usata per migliorare l\'estetica del grafico, ma la scala dei rami verrà modificata rispetto all\'originale: i rami **non saranno in scala**. L\'opzione <strong>Solo seleziionati</strong> può essere attivata per applicare la scelta solo ai nodi selezionati.</li></ul>'
    },
    "branch_style": {
      "help": '<p>In questa sezione è possibile trovare le opzioni per personalizzare i rami del tree.</p><ul><li><strong>Mostra etichette:</strong> l\'opzione permette di scegliere se mostrare o nascondere le etichette dei rami.</li><li><strong>Dimensione carattere:</strong>  permette di scegliere le dimensioni del testo delle etichette tramite l\'uso dell\'apposito campo o cursore.</li><li><strong>Ridimensionamento (%):</strong> opzione principale per la scala dei rami. Permette di aumentare o diminuire la lunghezza dei rami, grazie al cursore o specificando un valore nel campo sottostante.</li><li><strong>Comprimi collegamenti:</strong> usando il cursore o scrivendo un valore nel campo di questa opzione, tutti i rami più corti del valore selezionato verranno fatti collassare. I nodi che ricadono in tale intervallo verranno fusi. I valori delle lunghezze dei rami verranno adeguate in scala a quelle definite dai dati dell\'albero originale.</li><li><strong>Scala logaritmica:</strong> selezionando questa opzione le lunghezze di tutti i rami verranno ridimensionate in scala logaritmica.</li></ul>'
    },
    "branch_cutoffs": {
      "help": '<p>Le impostazioni in questa sezione permettono di rappresentare i rami in modi diversi in relazione alle loro lunghezze (i valori di lunghezza dei rami vengono riprodotti in scala rispetto alle lunghezze definite nei dati del grafico originale). Per aumentare o diminuire la scala puoi inserire un valore numerico nel campo <em>Per collegamenti più lunghi di</em>:</p><ul><li><strong>Mostra:</strong> mostra i rami più lunghi del valore inserito (predefinito).</li><li><strong>Nascondi:</strong> rende trasparenti i rami più lunghi del valore scelto. Nonostante i rami non siano mostrati, rimane possibile interagirvi.</li><li><strong>Accorcia:</strong> i rami più lunghi del valore di cutoff specificato verranno ridotti al valore di cutoff. I rami ridotti saranno rappresentati con linee tratteggiate per indicare che sono interessati dalla modifica <strong>Shorten</strong>.</li></ul>'
    },
    "map": {
      "help": '<p>Tramite le opzioni presenti in questa sezione potrai controllare l\'aspetto della mappa.</p><ul><li><strong>Aggrega per coordinate/per metadata:</strong> il toggle permette di aggregare i punti sulla mappa in base alla vicinanza geografica delle coordinate fornite o in base ai valori dei metadata caricati. Nel primo caso è possibile definire un valore numerico di <strong>delta</strong> che determina il grado di aggregazione.</li><li><strong>Raggio minimo/massimi marker:</strong> tramite questi due campi è possibile intervenire sulla dimensione dei punti sulla mappa definendo un raggio minimo ed un raggio massimo. La dimensione iniziale è relativa alla quantità di nodi presenti alle stesse cooridinate geografiche.</li><li><strong>Modalità diagramma/Modalità heatmap:</strong> questo toggle permette di cambiare la modalità di visualizzazione dei punti sulla mappa. Con la prima opzione (selezionata di default) i punti saranno visualizzati con dei grafici a torta in base alle categorie dei nodi del tree, con la seconda invece ai nodi viene applicata una sfocatura.</li></ul>'
    },
    "feedback": '<p>Puoi trovare la documentazione completa sul nostro <a href="https://cohesive.izs.it/wiki/user/Dashboards/GrapeTree/GrapeTree.html" target="_blank">wiki</a>. Puoi anche consultare la documentazione ufficiale di <a href="https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html" target="_blank">EnteroBase</a>.</p>'
  },
  "hide": "Nascondi",
  "hide_labels": "Nascondi etichette",
  "hide_sample_list": "Nascondi lista campioni",
  "hide_selected_nodes": "Nascondi nodi selezionati",
  "highlight_labels": "Evidenzia etichette",
  "histogram_view": "Modalità istogramma",
  "individual_segments": "Segmenti individuali",
  "input_output": "Input/Output",
  "invert_selection": "Inverti selezione",
  "join_by_coordinates": "Aggrega per coordinate",
  "join_by_metadata": "Aggrega per metadata",
  "kurtosis": "Kurtosis (%)",
  "labels": "Etichette",
  "label_asc": "Nome ascendente",
  "label_desc": "Nome discendente",
  "label_to_highlight": "Etichetta da evidenziare...",
  "last_updated_on": "Ultimo aggiornamento",
  "legend": "Legenda",
  "legend_tools": "Strumenti legenda",
  "list_view": "Modalità lista",
  "load_grapetree": "Carica GrapeTree",
  "log_scale" : "Scala logaritmica",
  "m_upload_file_label": "Carica un file .json, .nwk o .tsv..",
  "malformed_metadata_file_msg": "Ops! Sembra che il file dei metadata non sia ben formato.",
  "map": "Mappa",
  "map_tools": "Strumenti mappa",
  "max_marker_radius": "Raggio massimo marker",
  "maximum_group_number": "Numero massimo di gruppi",
  "metadata": "Metadata",
  "metadata_tools": "Strumenti metadata",
  "min_marker_radius": "Raggio minimo marker",
  "minimum_group_size": "Grandezza minima gruppo",
  "missing_tree_alert": "&Egrave; necessario caricare prima un file per la costruzione del Tree.",
  "move_to_first_position" : "Sposta in prima posizione",
  "no_category": "Nessuna categoria",
  "no_geo_info_message": "Ops! Non sono riuscito a trovare informazioni geospaziali tra i dati caricati.",
  "no_sample_selected": "Nessun campione selezionato",
  "node_size": "Dimensione nodi",
  "node_style": "Stile nodi",
  "numeric": "Numerico",
  "oops": "Ops!",
  "original_tree": "Tree iniziale",
  "pie_chart_mode": "Modalità diagramma",
  "qualitative_selection": "Selezione qualitativa",
  "quick_gradient": "Gradiente veloce",
  "radius_size": "Dimensione raggio (%)",
  "real_branch_length" : "Lunghezza branch reale",
  "rendering": "Rendering",
  "reset_default": "Reset default",
  "resize_columns" : "Ridimensiona colonne",
  "save_as_complete_json" : "Salva come json completo",
  "save_as_newick" : "Salva come newick",
  "save_feedback_geojson" : "Ops! Sembra che le informazioni geografiche non siano disponibili per il GrapeTree corrente.",
  "save_feedback_json" : "Ops! Sembra che ci siano dei problemi con il GrapeTree corrente.",
  "save_feedback_metadata" : "Ops! Sembra che i metatadata non siano disponibili per il GrapeTree corrente.",
  "save_feedback_newick" : "Ops! Sembra che le informazioni necessarie alla costruzione di un newick non siano disponibili per il GrapeTree corrente.",
  "save_grapetree": "Salva GrapeTree",
  "scaling": "Ridimensionamento (%)",
  "select_a_file": "Seleziona file",
  "select_all": "Seleziona tutti",
  "select_all_items": "Seleziona tutto",
  "select_file_msg": "Per favore seleziona un file da caricare.",
  "select_format_to_download" : "Seleziona il formato da scaricare",
  "select_grapetree_message": "Seleziona un campione per vederlo in GrapeTree",
  "select_language": "Seleziona lingua",
  "selected_only" : "Solo selezionati",
  "selected_samples": "Campioni selezionati",
  "set_as_figure_legend": "Imposta come legenda",
  "set_radius": "Imposta raggio",
  "set_value": "Imposta valore",
  "settings": "Impostazioni",
  "shorten": "Accorcia",
  "show_hypothetical": "Mostra ipotetico",
  "show_labels": "Mostra etichette",
  "show_metadata": "Mostra metadata",
  "show_sample_list": "Mostra lista campioni",
  "show_selected_subtrees": "Mostra subtree selezionati",
  "show_tooltips": "Mostra tooltips",
  "show_whole_tree": "Mostra tree intero",
  "size_asc": "Grandezza ascendente",
  "size_desc": "Grandezza discendente",
  "static": "Statico",
  "static_redraw": "Ridisegno statico",
  "support": "Supporto",
  "to": "A",
  "total_samples": "Totale numero campioni",
  "tree_layout": "Tree layout",
  "unreal_branch_length" : "Lunghezza branch non reale",
  "upload": "Carica",
  "useful_links" : "Link utili",
  "video": "Video",
  "visual_selection": "Selezione visiva"
};