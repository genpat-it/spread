let gtiz_languages = {};
/**
 * English
 * 
 */
gtiz_languages.en = {
  "all" : "All",
  "back_to_full_tree" : "Back to full tree",
  "branch_cutoffs": "Branch cutoffs",
  "branch_style": "Branch style",
  "category": "Category",
  "category2": "Category 2",
  "centre_tree": "Centre tree",
  "change_language": "Change language",
  "change_language_alert" : '<p><i class="iconic iconic-warning-triangle"></i> By changing language the application will reset.</p>',
  "character": "Character",
  "clean_selection": "Clean selection",
  "clusters": "Clusters",
  "clusters_by_category_and_mst_not_found" : "Clusters by given categories and thresholds were not found: {0}.",
  "clusters_zooms" : "Clusters zooms",
  "clusters_zooms_tools": "Clusters zooms tools",
  "collapse_branches": "Collapse branches",
  "collapse_selected_nodes": "Collapse selected nodes",
  "color_by": "Color by",
  "color_scheme": "Color scheme",
  "column_selection": "Column selection",
  "cookies_notice": "This application does not use cookies.",
  "crn_genome_sequencing": "CRN Genome Sequencing",
  "custom": "Custom",
  "data_category": "Data category",
  "deselect_all": "Deselect all",
  "display": "Display",
  "do_not_use_current_settings": "Do not use current settings",
  "download": "Download",
  "download_table": "Download table",
  "download_svg": "Download Svg",
  "drop_info": "You can also drag or load a .nwk file followed by a .tsv file containing metadata and optionally a .geojson file containing geo-saptial information. Please read more on our <a href=\"https://cohesive.izs.it/wiki/user/Dashboards/SPREAD/SPREAD.html\" target=\"_blank\">wiki</a>.",
  "drop_message": "Please drag here a valid .json file or load it from your file system to start with SPREAD.",
  "dropped_files_alert": "You can only drop one file at a time: a complete <strong>.json</strong> file or alternatively a <strong>.nwk</strong> then a <strong>.tsv</strong> containing metadata, and then optionally a <strong>.geojson</strong> containing spatial informations.",
  "dynamic" : "Dynamic",
  "expand_all": "Expand all",
  "expand_selected_nodes": "Expand selected nodes",
  "export_geoJson" : "Export geoJson",
  "export_metadata" : "Export metadata",
  "export_newick" : "Export newick",
  "fetch_error" : "Fetch request failed.",
  "font_size" : "Font size",
  "for_branches_longer_than" : "For branches longer than:",
  "forbidden_net_geojson_alert" : "It seems that you do not have permission to access the GeoJson indicated in the URL. Please try logging in to <a href='{0}' target='_blank'>{1}</a> and refresh the page.",
  "forbidden_net_metadata_alert" : "It seems that you do not have permission to access Metadata indicated in the URL. Please try logging in to <a href='{0}' target='_blank'>{1}</a> and refresh the page.",
  "forbidden_net_tree_alert" : "It seems that you do not have permission to access the Tree indicated in the URL. Please try logging in to <a href='{0}' target='_blank'>{1}</a> and refresh the page.",
  "forbidden_net_zooms_alert" : "It seems that you do not have permission to access the Zooms indicated in the URL. Please try logging in to <a href='{0}' target='_blank'>{1}</a> and refresh the page.",
  "from": "From",
  "fullscreen": "Full screen",
  "geojson_file_generic_problem": "It seems there is a problem with the geojson.",
  "gradient": "Gradient: Warm",
  "gradient_cool": "Gradient: Cold",
  "gradient_rainbow": "Rainbow",
  "gradient_rainbow2": "Rainbow Bright",
  "gradient_rainbow3": "Rainbow Dark",
  "grapetree": "GrapeTree",
  "grapetree_tools": "GrapeTree tools",
  "group_order": "Group order",
  "heat_map_mode": "Heatmap mode",
  "help": "Help",
  "helps": {
    "tree_layout": {
      "help": '<ul><li><strong>Centre Tree:</strong> adjusts view settings so that the tree\'s core is at the centre of the working area.</li><li><strong>Static Redraw:</strong> refreshes the tree and redraws it with the preset layout.</li><li><strong>Original Tree:</strong> reloads the page and reverts the tree to the state and layout it was in when it was first loaded. It will ask for confirmation before leaving the page.<strong>Caution</strong>: this function will cause you to lose all the changes you made to the tree.</li></ul>'
    },
    "node_style": {
      "help": '<p>Under this category you can find options to change the node\'s appearance or displayed information.</p><ul><li><strong>Colour by:</strong>from the dropdown menu of this section it\'s possible to choose the fill-in colour of the nodes according to metadata.</li><li><strong>Show Labels:</strong> the switch will allow to choose whether to show the node labels or hide them. You can choose which label to show from the dropdown menu just below.</li><li><strong>Font Size:</strong> the font size for the labels can be chosen either by dragging the slider or by specifying a size in the box.</li><li><strong>Highlight Label:</strong> use the text box to provide a search term for the labels to highlight the corresponding nodes. Supports Regular Expressions.</li><li><strong>Individual segments:</strong> use the switch to turn each node into a pie chart showing the breakdown of the members contained in it. The breakdown is based on the category used for the Colour by settings.</li></ul>'
    },
    "node_size": {
      "help": '<ul><li><strong>Node Size (%):</strong> the overall node size can be increased or decreased with the <em>Node Size (%)</em> option, either by using the slider or through the box.</li><li><strong>Kurtosis (%):</strong> by default the area of the nodes correlate with the members in them. Using the <em>Kurtosis (%)</em> section\'s slider or box, the node\'s size can be increased or decreased based on the distribution\'s kurtosis of the nodes. By increasing this value, you raise the percentage by which the node size grows per member in the node, thus nodes with a larger number of members will have a larger area and will stick out more.</li></ul>'
    },
    "rendering": {
      "help": '<p>This section contains <em>Rendering Layout</em> options, which control how nodes are positioned in the tree. Two modes are available: <em>Static</em> and <em>Dynamic</em>.</p><ul><li><strong>Static:</strong> in <em>Static</em> mode the tree layout is calculated when the tree is generated and remains static (but interactive), relative branch lenght and scaling (from the original tree data) will always be mantained as long as the <strong>Real Branch Lenght</strong> option is checked.</li><li><strong>Dynamic:</strong> nodes are positioned dynamically in a way similar to a <a href="https://gist.github.com/mbostock/4062045" target="_blank">Force Directed Layout</a> and will try to fan out in order to distance themselves from the neighbours. The tree can be moved around freely by dragging it and the nodes will spread out to mantain the distances among themselves. The <em>Dynamic</em> mode can be used to improve the aesthetics of the tree, but branch lenght scaling will be modified. Branches will NOT be to scale when in <em>Dynamic</em> mode. Toggle on the <strong>Selected Only</strong> option to apply only to selected nodes.</li></ul>'
    },
    "branch_style": {
      "help": '<p>In this section you\'ll find options to customise the tree\'s branches.</p><ul><li><strong>Show Labels:</strong> the <em>Show Labels</em> switch will allow to choose whether to show the branch labels or hide them.</li><li><strong>Font Size:</strong> options from where the font size for the labels can be chosen by means of the slider or the box.</li><li><strong>Scaling (%):</strong> the main <em>Scaling</em> option allows to increase or decrease the overall branches\' lenght, by using the slider or by specifying a value in the box below the slider.</li><li><strong>Collapse Branches:</strong> use the slider or enter a value in the box to collapse all branches shorter than specified lenght. Nodes falling in that interval will be merged together. Branch lenght values are scaled to the branch lenghts defined in the original tree data.</li><li><strong>Log Scale:</strong> by checking the box, all lenghts of all branches will be scaled logarithmically.</li></ul>'
    },
    "branch_cutoffs": {
      "help": '<p>The settings in this section will allow to render the branches in different ways depending on their lenght (branch lenght values are scaled to the branch lenghts defined in the original tree data). Use the box to enter a value. For branches longer than the specified value it\'s possible to choose whether to display them, hide them or shorten them:</p><ul><li><strong>Display:</strong> show long branches as normal (default).</li><li><strong>Hide:</strong> makes long branches transparent. Even though the branches are not displayed, it\'s still possible to interact with them.</li><li><strong>Shorten:</strong> branches longer than specified cutoff will be cropped back to the specified cutoff. The branches will appear as dashed lines to indicate those that are affected.</li></ul>'
    },
    "map": {
      "help": '<p>Through the options available in this section, you can control the appearance of the map.</p><ul><li><strong>Join by coordinates/by metadata:</strong> The toggle allows you to aggregate points on the map based on the geographical proximity of the provided coordinates or based on the values of the loaded metadata. In the first case, you can define a numerical value for <strong>delta</strong>, which determines the degree of aggregation.</li><li><strong>Minimum/Maximum marker radius:</strong> With these two fields, you can adjust the size of the points on the map by defining a minimum and a maximum radius. The initial size is relative to the number of nodes present at the same geographical coordinates.</li><li><strong>Pie Chart mode/Heatmap mode:</strong> This toggle allows you to change the visualization mode of the points on the map. With the first option (selected by default), the points will be displayed with pie charts based on the categories of the tree nodes, while with the second option, a blur effect is applied to the nodes.</li></ul>'
    },
    "feedback": '<p>You can find the complete documentation on our <a href="https://cohesive.izs.it/wiki/user/Dashboards/SPREAD/SPREAD.html" target="_blank">wiki</a>. Please visit also <a href="https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html" target="_blank">EnteroBase documentation</a>.</p>'
  },
  "hide": "Hide",
  "hide_labels": "Hide labels",
  "hide_sample_list": "Hide sample list",
  "hide_selected_nodes": "Hide selected nodes",
  "hide_selection_alerts": "Hide selection alerts",
  "highlight_labels": "Highlight labels",
  "histogram_view": "Histogram view",
  "im_fine_thanks": "I'm fine thanks",
  "individual_segments": "Individual segments",
  "input_output": "Input/Output",
  "invert_selection": "Invert selection",
  "join_by_coordinates": "Join by coordinates",
  "join_by_metadata": "Join by metadata",
  "kurtosis": "Kurtosis (%)",
  "labels": "Labels",
  "label_asc": "Label ascendant",
  "label_desc": "Label descendant",
  "label_to_highlight": "Label to highlight...",
  "last_updated_on": "Last updated on",
  "legend": "Legend",
  "legend_tools": "Legend tools",
  "list_view": "List view",
  "load_cluster": "Load cluster",
  "load_cluster_in_new_tab": "Load in new tab",
  "load_grapetree": "Load GrapeTree",
  "load_spread": "Load SPREAD",
  "load_tree": "Load tree",
  "log_scale" : "Log scale",
  "m_upload_file_label": "Upload .json, .nwk or .tsv file...",
  "malformed_metadata_file_msg": "It seems metatada file is malformed.",
  "map": "Map",
  "map_tools": "Map tools",
  "max_marker_radius": "Max marker radius",
  "maximum_group_number": "Maximum number of groups",
  "metadata": "Metadata",
  "metadata_file_generic_problem": "It seems there is a problem with the metadata file.",
  "metadata_geo_problems": "It seems there is a problem on the definition of geographic coordinates (lat, lon) in the metadata file.",
  "metadata_tools": "Metadata tools",
  "min_marker_radius": "Min marker radius",
  "minimum_group_size": "Mininimum group size",
  "missing_net_geo_alert": "It seems there is a problem with the geojson indicated in the url.",
  "missing_net_tree_alert": "It seems there is a problem with the tree file indicated in the url.",
  "missing_net_tsv_alert": "It seems there is a problem with the metadata file indicated in the url.",
  "missing_net_zooms_alert": "It seems there is a problem with the zooms file indicated in the url.",
  "missing_tree_alert": "A tree should be loaded first.",
  "move_to_first_position" : "Move to first position",
  "no_category": "No category",
  "no_geo_info_message": "Oops! I was not able to find geo-spatial information in loaded data.",
  "no_sample_selected": "No sample selected",
  "node_size": "Node size",
  "node_style": "Node style",
  "not_found_net_geojson_alert" : "I can't find the GeoJson indicated in the URL, please try to verify that the path and/or file name are correct.",
  "not_found_net_metadata_alert" : "I can't find Metadata indicated in the URL, please try to verify that the path and/or file name are correct.",
  "not_found_net_tree_alert" : "I can't find the Tree indicated in the URL, please try to verify that the path and/or file name are correct.",
  "not_found_net_zooms_alert" : "I can't find the Zooms indicated in the URL, please try to verify that the path and/or file name are correct.",
  "numeric": "Numeric",
  "oops": "Oops! Something went wrong.",
  "oops_not_found_http": "Oops! File not found.",
  "oops_forbidden_http": "Oops! Permission denied.",
  "original_tree": "Original tree",
  "pie_chart_mode": "Pie Chart mode",
  "possible_performance_issues_message" : "Possible performance issues, I suggest to set link distances value to <strong>{0}</strong>.",
  "quick_gradient": "Quick gradient",
  "radius_size": "Radius size (%)",
  "real_branch_length" : "Real branch length",
  "related_nodes_selection" : "Related nodes selection",
  "rendering": "Rendering",
  "reset_default": "Reset default",
  "resize_columns" : "Resize columns",
  "samples_by_mst_and_cluster_not_found": "Samples by thresholds and clusters were not found in metadata.",
  "save_as_complete_json" : "Save as complete json",
  "save_as_newick" : "Save as newick",
  "save_feedback_geojson" : "Oops! It seems there are no geographical information defined for current tree.",
  "save_feedback_json" : "Oops! It seems there are some problems with the current tree.",
  "save_feedback_metadata" : "Oops! It seems there are no metatadata defined for current tree.",
  "save_feedback_newick" : "Oops! It seems there are no newick defined for current tree.",
  "save_grapetree": "Save GrapeTree",
  "save_spread": "Save SPREAD",
  "save_tree": "Save tree",
  "scaling": "Scaling (%)",
  "see_available_clusters": "See available clusters",
  "see_available_zooms" : "See available zooms",
  "see_clusters_zooms": "See clusters zooms",
  "select_a_file": "Select a file",
  "select_all": "Select all",
  "select_all_items": "Select all items",
  "select_cluster": "Select cluster",
  "select_file_msg": "Please select a file to load.",
  "select_format_to_download" : "Select format to download",
  "select_tree_message": "Select a sample to see it in the tree",
  "select_involved_nodes": "Select involved nodes",
  "select_language": "Select language",
  "select_threshold": "Select threshold",
  "select_tree_message": "Select a sample to see it in the tree",
  "selected_only" : "Selected only",
  "selected_samples": "Selected samples",
  "selected_threshold_not_found_in_metadata": "Selected threshold is not in metadata.",
  "set_as_figure_legend": "Set as figure legend",
  "set_radius": "Set radius",
  "set_value": "Set value",
  "settings": "Settings",
  "shorten": "Shorten",
  "show_hypothetical": "Show hypothetical",
  "show_labels": "Show labels",
  "show_metadata": "Show metadata",
  "show_sample_list": "Show sample list",
  "show_selected_subtrees": "Show selected subtrees",
  "show_selection_alerts": "Show selection alerts",
  "show_tooltips": "Show tooltips",
  "show_whole_tree": "Show whole tree",
  "size_asc": "Size ascendant",
  "size_desc": "Size descendant",
  "static": "Static",
  "static_redraw": "Static redraw",
  "support": "Support",
  "to": "To",
  "total_samples": "Total samples",
  "thresholds_not_found_in_metadata" : "Thresholds not found in metadata.",
  "tree_layout": "Tree layout",
  "tree_tools": "Tree tools",
  "unreal_branch_length" : "Unreal branch length",
  "upload": "Upload",
  "use_current_settings": "Use current settings",
  "useful_links" : "Useful links",
  "video": "Video",
  "visual_selection": "Visual selection",
  "zooms_available_for_selected_nodes" : "Zooms available for selected nodes",
  "zooms_available_for_selected_nodes_info" : "You can disable zooms selection alerts form <strong>Clusters zoom</strong> context menu.",
  "zooms_available_for_selected_nodes_message" : "One or more selected nodes contain samples for which zooms are available.",
  "zoomed_clusters": "Zoomed clusters",
  "zooms_clusters_generic_problem": "It seems there is a problem with clusters definition.",
  "zooms_found_for_clusters": "Zooms found for clusters",
  "zooms_found_for_clusters_info": "You can also see them using the <strong>Clusters zoom</strong> contextual menu at the top right of the component.",
  "zooms_found_for_clusters_message": "Current tree has zooms for one or more clusters.",
  "zooms_tools": "Zoom tools"
};
/**
 * Italiano
 * 
 */
gtiz_languages.it = {
  "all" : "Tutti",
  "back_to_full_tree" : "Back to full tree",
  "branch_cutoffs": "Taglio collegamenti",
  "branch_style": "Stile collegamenti",
  "category": "Categoria",
  "category2": "Categoria 2",
  "centre_tree": "Centra tree",
  "change_language": "Cambia lingua",
  "change_language_alert" : '<p><i class="iconic iconic-warning-triangle"></i> Cambiando lingua l\'applicazione subirà un reset.</p>',
  "character": "Testuale",
  "clean_selection": "Pulisci selezione",
  "clusters": "Clusters",
  "clusters_by_category_and_mst_not_found" : "Non sono stati trovati clusters a partire da categoire e soglie fornite: {0}.",
  "clusters_zooms" : "Zoom dei cluster",
  "clusters_zooms_tools": "Strumenti zoom dei cluster",
  "collapse_branches": "Comprimi collegamenti",
  "collapse_selected_nodes": "Comprimi nodi selezionati",
  "color_by": "Colora per",
  "color_scheme": "Schema colore",
  "column_selection": "Selezione colonna",
  "cookies_notice": "Questa applicazione non utilizza cookies.",
  "crn_genome_sequencing": "CRN Sequenze Genomiche",
  "custom": "Custom",
  "data_category": "Categoria dati",
  "deselect_all": "Deseleziona tutti",
  "display": "Mostra",
  "do_not_use_current_settings": "Non usare impostazioni correnti",
  "download": "Download",
  "download_table": "Esporta tabella",
  "download_svg": "Download Svg",
  "drop_info": "Puoi anche trascinare o caricare un file .nwk seguito da un file .tsv per i metadata da associare al tree. Opzionalmente puoi trascinare o caricare un file .geojson contenente informazioni geospaziali. Puoi trovare una guida completa sul nostro <a href=\"https://cohesive.izs.it/wiki/user/Dashboards/SPREAD/SPREAD.html\" target=\"_blank\">wiki</a>.",
  "drop_message": "Trascina in quest'area un file .json valido oppure caricalo dal tuo computer per iniziare con SPREAD.",
  "dropped_files_alert": "Puoi trascinare un solo file per volta: un file <strong>.json</strong> completo o in alternativa un file <strong>.nwk</strong> seguito da un file <strong>.tsv</strong> per i metadata, infine eventualmente un file <strong>.geojson</strong> per dati geospaziali.",
  "dynamic" : "Dinamico",
  "expand_all": "Espandi tutti",
  "expand_selected_nodes" : "Espandi nodi selezionati",
  "export_geoJson" : "Esporta geoJson",
  "export_metadata" : "Esporta metadata",
  "export_newick" : "Esporta newick",
  "fetch_error" : "La richiesta di caricamento del file non è riuscita.",
  "font_size" : "Dimensione carattere",
  "for_branches_longer_than" : "Per collegamenti più lunghi di:",
  "forbidden_net_geojson_alert" : "Sembra che tu non abbia i permessi per accedere al GeoJson indicato nella URL. Prova a fare la login su <a href='{0}' target='_blank'>{1}</a> ed aggiorna la pagina.",
  "forbidden_net_metadata_alert" : "Sembra che tu non abbia i permessi per accedere ai Metadata indicati nella URL. Prova a fare la login su <a href='{0}' target='_blank'>{1}</a> ed aggiorna la pagina.",
  "forbidden_net_tree_alert" : "Sembra che tu non abbia i permessi per accedere al Tree indicato nella URL. Prova a fare la login su <a href='{0}' target='_blank'>{1}</a> ed aggiorna la pagina.",
  "forbidden_net_zooms_alert" : "Sembra che tu non abbia i permessi per accedere agli Zoom indicati nella URL. Prova a fare la login su <a href='{0}' target='_blank'>{1}</a> ed aggiorna la pagina.",
  "from": "Da",
  "fullscreen": "Full screen",
  "geojson_file_generic_problem": "Sembra esserci un problema con il geojson.",
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
      "help": '<p>Nella categoria <em>Node style</em> è possibile trovare opzioni per modificare l\'aspetto dei nodi o le relative informazioni visualizzate.</p><ul><li><strong>Colora per:</strong>dal menù a cascata di questa sezione si può selezionare il colore di riempimento dei nodi, in base ai metadati.</li><li><strong>Mostra etichette:</strong> l\'opzione permette di scegliere se visualizzare o meno le etichette dei nodi. &Egrave; anche possibile scegliere che tipo di etichetta mostrare dal menù a cascata sotto l\'interruttore <em>Show Labels</em>.</li><li><strong>Dimensione carattere:</strong> le dimensioni del font sono modifcabili trascinando l\'apposito cursore o specificando le dimensioni desiderate nel campo sottostante.</li><li><strong>Evidenzia etichette:</strong> usa il campo di ricerca per evidenziare i le etichette dei nodi. Sono supportate le Espressioni Regolari.</li><li><strong>Segmenti individuali:</strong> l\'interruttore di questa opzione permette di trasformare i nodi in grafici a torta, ognuno dei quali presenterà una scomposizione degli elementi in esso contenuti.</li></ul>'
    },
    "node_size": {
      "help": '<ul><li><strong>Dimensione raggio (%):</strong> la dimensione dei nodi può essere aumentata o diminuita trascinando l\'apposito cursore o specificando le dimensioni nel campo.</li><li><strong>Kurtosis (%):</strong> di base, l\'area dei nodi è correlata con il numero di elementi che ne fanno parte. Usando il cursore o il campo nella sezione <em>Kurtosis (%)</em>, le dimensioni dei nodi possono essere diminuite o aumentate sulla base della distribuzione della kurtosis dei nodi. Aumentando il valore di kurtosis, incrementa la percentuale della quale la dimensione dei nodi aumenta per ogni elemento nel nodo, permettendo quindi ai nodi con un maggior numero di membri di risaltare di più per via di un maggior aumento percentuale della loro area.</li></ul>'
    },
    "rendering": {
      "help": '<p>La sezione <em>Rendering</em> contiene delle opzioni che permettono di controllare il posizionamento dei nodi nel grafico. Sono disponibili due modalità: <em>Statico</em> e <em>Dinamico</em>.</p><ul><li><strong>Statico:</strong> in modalità <em>Statica</em> il layout dell\'albero viene calcolato alla generazione del grafico e viene mantenuto statico ma interattivo; la lunghezza relativa dei rami e la loro scala rimane statica (derivata dai dati del grafico originale) e viene sempre mantenuta fintanto che l\'opzione <strong>Lunghezza branch reale</strong> rimane selezionata.</li><li><strong>Dinamico:</strong> i nodi vengono posizionati dinamicamente in maniera simile ad una modalità <a href="https://gist.github.com/mbostock/4062045" target="_blank">Force Directed Layout</a>, ma tenteranno di sparpagliarsi per distanziarsi dai nodi vicini. In questa modalità l\'albero può essere spostato liberamente, trascinandolo con il mouse; i nodi si ridisporranno sempre automaticamente per mantenere le distanze dai nodi circostanti, a seguito dello spostamento. La modalità dinamica può essere usata per migliorare l\'estetica del grafico, ma la scala dei rami verrà modificata rispetto all\'originale: i rami <strong>non saranno in scala</strong>. L\'opzione <strong>Solo selezionati</strong> può essere attivata per applicare la scelta solo ai nodi selezionati.</li></ul>'
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
    "feedback": '<p>Puoi trovare la documentazione completa sul nostro <a href="https://cohesive.izs.it/wiki/user/Dashboards/SPREAD/SPREAD.html" target="_blank">wiki</a>. Puoi anche consultare la documentazione ufficiale di <a href="https://enterobase.readthedocs.io/en/latest/grapetree/grapetree-about.html" target="_blank">EnteroBase</a>.</p>'
  },
  "hide": "Nascondi",
  "hide_labels": "Nascondi etichette",
  "hide_sample_list": "Nascondi lista campioni",
  "hide_selected_nodes": "Nascondi nodi selezionati",
  "hide_selection_alerts": "Nascondi avvisi di selezione",
  "highlight_labels": "Evidenzia etichette",
  "histogram_view": "Modalità istogramma",
  "im_fine_thanks": "Ok cos&igrave;",
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
  "load_cluster": "Carica cluster",
  "load_cluster_in_new_tab": "Apri in nuova scheda",
  "load_grapetree": "Carica GrapeTree",
  "load_spread": "Carica SPREAD",
  "load_tree": "Carica albero",
  "log_scale" : "Scala logaritmica",
  "m_upload_file_label": "Carica un file .json, .nwk o .tsv..",
  "malformed_metadata_file_msg": "Sembra che il file dei metadata non sia ben formato.",
  "map": "Mappa",
  "map_tools": "Strumenti mappa",
  "max_marker_radius": "Raggio massimo marker",
  "maximum_group_number": "Numero massimo di gruppi",
  "metadata": "Metadata",
  "metadata_file_generic_problem": "Sembra esserci un problema con il file dei metadata.",
  "metadata_geo_problems": "Sembra che ci siano problemi nella definizione delle coordinate geografiche all'interno del file .tsv dei metadati.",
  "metadata_tools": "Strumenti metadata",
  "min_marker_radius": "Raggio minimo marker",
  "minimum_group_size": "Grandezza minima gruppo",
  "missing_net_geo_alert": "Sembra esserci un problema con il geojson indicato nella url.",
  "missing_net_tree_alert": "Sembra esserci un problema con il file per la costruzione del tree indicato nella url.",
  "missing_net_tsv_alert": "Sembra esserci un problema con il file dei metadata indicato nella url.",
  "missing_net_zooms_alert": "Sembra esserci un problema con il file degli zoom indicato nella url.",
  "missing_tree_alert": "&Egrave; necessario caricare prima un file per la costruzione del Tree.",
  "move_to_first_position" : "Sposta in prima posizione",
  "no_category": "Nessuna categoria",
  "no_geo_info_message": "Ops! Non sono riuscito a trovare informazioni geospaziali tra i dati caricati.",
  "no_sample_selected": "Nessun campione selezionato",
  "node_size": "Dimensione nodi",
  "node_style": "Stile nodi",
  "not_found_net_geojson_alert" : "Non riesco a trovare il GeoJson indicato nella URL, prova a verificare che percorso e/o nome del file siano corretti.",
  "not_found_net_metadata_alert" : "Non riesco a trovare i Metadata indicati nella URL, prova a verificare che percorso e/o nome del file siano corretti.",
  "not_found_net_tree_alert" : "Non riesco a trovare il Tree indicato nella URL, prova a verificare che percorso e/o nome del file siano corretti.",
  "not_found_net_zooms_alert" : "Non riesco a trovare gli zoom indicati nella URL, prova a verificare che percorso e/o nome del file siano corretti.",
  "numeric": "Numerico",
  "oops": "Ops! Qualcosa è andato storto.",
  "oops_not_found_http": "Ops! File non trovato.",
  "oops_forbidden_http": "Ops! Permesso negato.",
  "original_tree": "Tree iniziale",
  "pie_chart_mode": "Modalità diagramma",
  "possible_performance_issues_message" : "Potresti avere problemi di performance visualizzando il tree esteso. Suggerisco di impostare la distanza dei collegamenti su <strong>{0}</strong>.",
  "quick_gradient": "Gradiente veloce",
  "radius_size": "Dimensione raggio (%)",
  "real_branch_length" : "Lunghezza branch reale",
  "related_nodes_selection" : "Selezione nodi correlati",
  "rendering": "Rendering",
  "reset_default": "Reset default",
  "resize_columns" : "Ridimensiona colonne",
  "samples_by_mst_and_cluster_not_found": "Campioni per soglie e clusters non trovati nei metadata.",
  "save_as_complete_json" : "Salva come json completo",
  "save_as_newick" : "Salva come newick",
  "save_feedback_geojson" : "Ops! Sembra che le informazioni geografiche non siano disponibili per l'albero corrente.",
  "save_feedback_json" : "Ops! Sembra che ci siano dei problemi con l'albero corrente.",
  "save_feedback_metadata" : "Ops! Sembra che i metatadata non siano disponibili per l'albero corrente.",
  "save_feedback_newick" : "Ops! Sembra che le informazioni necessarie alla costruzione di un newick non siano disponibili per l'albero corrente.",
  "save_grapetree": "Salva GrapeTree",
  "save_spread": "Salva SPREAD",
  "save_tree": "Salva albero",
  "scaling": "Ridimensionamento (%)",
  "see_available_clusters": "Mostra cluster disponibili",
  "see_available_zooms" : "Mostra zoom disponibili",
  "see_clusters_zooms": "Apri zoom dei cluster",
  "select_a_file": "Seleziona file",
  "select_all": "Seleziona tutti",
  "select_all_items": "Seleziona tutto",
  "select_cluster": "Seleziona cluster",
  "select_file_msg": "Per favore seleziona un file da caricare.",
  "select_format_to_download" : "Seleziona il formato da scaricare",
  "select_involved_nodes": "Seleziona nodi coinvolti",
  "select_language": "Seleziona lingua",
  "select_threshold": "Seleziona soglia",
  "select_tree_message": "Seleziona un campione per vederlo nell'albero",
  "selected_only" : "Solo selezionati",
  "selected_samples": "Campioni selezionati",
  "selected_threshold_not_found_in_metadata": "La soglia selezionata non è presente nei metadata.",
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
  "show_selection_alerts": "Mostra avvisi di selezione",
  "show_tooltips": "Mostra tooltips",
  "show_whole_tree": "Mostra tree intero",
  "size_asc": "Grandezza ascendente",
  "size_desc": "Grandezza discendente",
  "spread_tools": "Strumenti SPREAD",
  "static": "Statico",
  "static_redraw": "Ridisegno statico",
  "support": "Supporto",
  "to": "A",
  "total_samples": "Totale numero campioni",
  "thresholds_not_found_in_metadata" : "Soglie non trovate nei metadata.",
  "tree_layout": "Tree layout",
  "tree_tools": "Strumenti albero",
  "unreal_branch_length" : "Lunghezza branch non reale",
  "upload": "Carica",
  "use_current_settings": "Usa impostazioni correnti",
  "useful_links" : "Link utili",
  "video": "Video",
  "visual_selection": "Selezione visiva",
  "zooms_available_for_selected_nodes" : "Zoom disponibili per i nodi selezionati",
  "zooms_available_for_selected_nodes_info" : "Puoi disabilitare gli avvisi di selezione degli ingrandimenti dal menu contestuale <strong>Zoom dei cluster</strong>.",
  "zooms_available_for_selected_nodes_message" : "Uno o più nodi selezionati contengono campioni per cui sono disponibili ingrandimenti.",
  "zoomed_clusters": "Zoom cluster",
  "zooms_clusters_generic_problem": "Sembra ci sia un problema con la definizione dei clusters.",
  "zooms_found_for_clusters": "Sono disponibili degli zoom sui cluster",
  "zooms_found_for_clusters_info": "Puoi vederli anche utilizzando il menu contestuale <strong>Zoom dei cluster</strong> in alto a destra del componente.",
  "zooms_found_for_clusters_message": "Il tree corrente ha degli zoom per uno o più cluster.",
  "zooms_tools": "Strumenti zoom"
};
