

//--------------------------------------------------------------------------------------------------
// http://stackoverflow.com/questions/1303646/check-whether-variable-is-number-or-string-in-javascript
function isNumber (o) {
  return ! isNaN (o-0);
}

//--------------------------------------------------------------------------------------------------
// Data-backed selection shim (canvas migration).
//
// The tree no longer materialises one SVG element per node/link, so the old
// d3 selections this.node_elements / this.link_elements would be empty. Many
// call sites, however, use those selections only to iterate the DATA and mutate
// model flags (e.g. brushEnded sets node.selected, _dragStarted reads tagged).
//
// This shim wraps the underlying data array and reproduces the subset of the d3
// selection API those call sites rely on: .filter() still runs its callback over
// the data (preserving side effects) and returns a smaller selection; iteration
// helpers (.nodes/.size/.empty/.node/.each) work on the data; all DOM-mutating
// methods (.selectAll/.append/.attr/.style/.remove/...) become harmless no-ops,
// because the visible result is now produced by the canvas renderer reading the
// same model flags. This keeps the existing logic intact with minimal changes.
function MstDataSelection (data) {
  this._data = data || [];
}
MstDataSelection.prototype.filter = function (fn) {
  var out = [];
  for (var i = 0; i < this._data.length; i++) {
    if (fn.call(this._data[i], this._data[i], i, this._data)) {
      out.push(this._data[i]);
    }
  }
  return new MstDataSelection(out);
};
MstDataSelection.prototype.each = function (fn) {
  for (var i = 0; i < this._data.length; i++) {
    fn.call(this._data[i], this._data[i], i, this._data);
  }
  return this;
};
MstDataSelection.prototype.nodes = function () { return this._data; };
MstDataSelection.prototype.size = function () { return this._data.length; };
MstDataSelection.prototype.empty = function () { return this._data.length === 0; };
MstDataSelection.prototype.node = function () { return this._data.length ? this._data[0] : null; };
// Chainable no-op methods (the DOM side effects are replaced by canvas drawing).
['selectAll', 'select', 'data', 'enter', 'exit', 'append', 'insert', 'remove',
 'attr', 'style', 'classed', 'property', 'text', 'html', 'on', 'sort', 'order',
 'transition', 'merge', 'datum', 'lower', 'raise', 'interrupt', 'call', 'duration',
 'delay', 'ease'].forEach(function (m) {
  MstDataSelection.prototype[m] = function () { return this; };
});

//--------------------------------------------------------------------------------------------------
//https://raw.github.com/kvz/phpjs/master/functions/strings/strstr.js
function strstr (haystack, needle, bool) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: strstr('Kevin van Zonneveld', 'van');
  // *     returns 1: 'van Zonneveld'
  // *     example 2: strstr('Kevin van Zonneveld', 'van', true);
  // *     returns 2: 'Kevin '
  // *     example 3: strstr('name@example.com', '@');
  // *     returns 3: '@example.com'
  // *     example 4: strstr('name@example.com', '@', true);
  // *     returns 4: 'name'
  var pos = 0;

  haystack += '';
  pos = haystack.indexOf(needle);
  if (pos == -1) {
    return false;
  } else {
    if (bool) {
      return haystack.substr(0, pos);
    } else {
      return haystack.slice(pos);
    }
  }
}

//--------------------------------------------------------------------------------------------------
// https://github.com/kvz/phpjs/blob/master/functions/strings/strchr.js
function strchr (haystack, needle, bool) {
  // http://kevin.vanzonneveld.net
  // +   original by: Philip Peterson
  // -    depends on: strstr
  // *     example 1: strchr('Kevin van Zonneveld', 'van');
  // *     returns 1: 'van Zonneveld'
  // *     example 2: strchr('Kevin van Zonneveld', 'van', true);
  // *     returns 2: 'Kevin '
  return this.strstr(haystack, needle, bool);
}

var NEXUSPunctuation = "()[]{}/\\,;:=*'\"`+-";
var NEXUSWhiteSpace  = "\n\r\t ";

//--------------------------------------------------------------------------------------------------
function TokenTypes(){} 
TokenTypes.None 		= 0;
TokenTypes.String 		= 1;
TokenTypes.Hash 		= 2;
TokenTypes.Number 		= 3;
TokenTypes.SemiColon 	= 4;
TokenTypes.OpenPar		= 5;
TokenTypes.ClosePar 	= 6;
TokenTypes.Equals 		= 7;
TokenTypes.Space 		= 8;
TokenTypes.Comma  		= 9;
TokenTypes.Asterix 		= 10;
TokenTypes.Colon 		= 11;
TokenTypes.Other 		= 12;
TokenTypes.Bad 			= 13;
TokenTypes.Minus 		= 14;
TokenTypes.DoubleQuote 	= 15;
TokenTypes.Period 		= 16;
TokenTypes.Backslash 	= 17;
TokenTypes.QuotedString	= 18;

//--------------------------------------------------------------------------------------------------
function NumberTokens(){}
NumberTokens.start 		= 0;
NumberTokens.sign 		= 1;
NumberTokens.digit 		= 2;
NumberTokens.fraction 	= 3;
NumberTokens.expsymbol 	= 4;
NumberTokens.expsign 	= 5;
NumberTokens.exponent 	= 6;
NumberTokens.bad 		= 7;
NumberTokens.done 		= 8;

//--------------------------------------------------------------------------------------------------
function StringTokens(){}
StringTokens.ok 		= 0;
StringTokens.quote 		= 1;
StringTokens.done 		= 2;

//--------------------------------------------------------------------------------------------------
function NexusError(){}
NexusError.ok 			= 0;
NexusError.nobegin 		= 1;
NexusError.noend 		= 2;
NexusError.syntax 		= 3;
NexusError.badcommand 	= 4;
NexusError.noblockname 	= 5;
NexusError.badblock	 	= 6;
NexusError.nosemicolon	= 7;

//--------------------------------------------------------------------------------------------------
function Scanner(str)
{
	this.error = 0;
	this.comment = '';
	this.pos = 0;
	this.str = str;
	this.token = 0;
	this.buffer = '';
	this.returnspace = false;
	this.taxa={};
	this.current_node="";
	this.nodes={};
	this.hypo_node=1;
	this.node_information={};
	this.reg_ex=(/\{.+?\}/g);
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.GetToken = function(returnspace)
{		
	this.returnspace = typeof returnspace !== 'undefined' ? returnspace : false;
	
	this.token = TokenTypes.None;
	
	while ((this.token == TokenTypes.None) && (this.pos < this.str.length))
	{
		//console.log(this.str.charAt(this.pos));
		//console.log(this.buffer);
		//console.log(this.token);
		
		if (strchr(NEXUSWhiteSpace, this.str.charAt(this.pos)))
		{
			if (this.returnspace && (this.str.charAt(this.pos) == ' '))
			{
				this.token = TokenTypes.Space;
			}
		}
		else
		{
			if (strchr(NEXUSPunctuation, this.str.charAt(this.pos)))
			{
				this.buffer = this.str.charAt(this.pos);
				switch (this.str.charAt(this.pos))
			
				{
					case '[':
						this.ParseComment();
						break;
					case "'":
						if (this.ParseString())
						{
							this.token = TokenTypes.QuotedString;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
						break;
					case '(':
						this.token = TokenTypes.OpenPar;
						break;
					case ')':
						this.token = TokenTypes.ClosePar;
						break;
					case '=':
						this.token = TokenTypes.Equals;
						break;
					case ';':
						this.token = TokenTypes.SemiColon;
						break;
					case ',':
						this.token = TokenTypes.Comma;
						break;
					case '*':
						this.token = TokenTypes.Asterix;
						break;
					case ':':
						this.token = TokenTypes.Colon;
						break;
					case '-':
						this.token = TokenTypes.Minus;
						break;
					case '"':
						this.token = TokenTypes.DoubleQuote;
						break;
					case '/':
						this.token = TokenTypes.BackSlash;
						break;
					default:
						this.token = TokenTypes.Other;
						break;
				}
			}
			else
			{
				if (this.str.charAt(this.pos) == '#')
				{
					this.token = TokenTypes.Hash;
				}
				else if (this.str.charAt(this.pos) == '.')
				{
					this.token = TokenTypes.Period;
				}
				else
				{
					if (isNumber(this.str.charAt(this.pos)))
					{
						if (this.ParseNumber())
						{
							this.token = TokenTypes.Number;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
					}
					else
					{
						if (this.ParseToken())
						{
							this.token = TokenTypes.String;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
					}
				}
			}
		}
		this.pos++;
	}
	return this.token;
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseComment = function()
{		
	this.buffer = '';
	
	while ((this.str.charAt(this.pos) != ']') && (this.pos < this.str.length))
	{
		this.buffer += this.str.charAt(this.pos);
		this.pos++;
	}
	this.buffer += this.str.charAt(this.pos);
	/*var trim = this.buffer.substring(1,this.buffer.length-1);
	var info = trim.split("&");
	for (var index in info){
		if (!info[index]){
			continue;
		}
		var args = info[index].split("=");
		if (args.length <=1){
			continue;
		}
		var val = args[1].substring(1,args[1].length-1);
		var val_list = val.split(",");
		this.nodes[this.current_node]={}
		this.nodes[this.current_node][args[0]]=val_list;
	
	}
	*/
	this.current_comment=this.buffer;
	return this.buffer;
	//console.log('[' + this.buffer + ']');
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseNumber = function()
{		
	this.buffer = '';
	var state = NumberTokens.start;
	
	while (
		(this.pos < this.str.length)
		&& (!strchr (NEXUSWhiteSpace, this.str.charAt(this.pos)))
		&& (!strchr (NEXUSPunctuation, this.str.charAt(this.pos)))
		&& (this.str.charAt(this.pos) != '-')
		&& (state != NumberTokens.bad)
		&& (state != NumberTokens.done)
		)
	{
		if (isNumber(this.str.charAt(this.pos)))
		{
			switch (state)
			{
				case NumberTokens.start:
				case NumberTokens.sign:
					state =  NumberTokens.digit;
					break;
				case NumberTokens.expsymbol:
				case NumberTokens.expsign:
					state =  NumberTokens.exponent;
					break;
				default:
					break;
			}
		}
		else if ((this.str.charAt(this.pos) == '-') && (this.str.charAt(this.pos) == '+'))
		{
			switch (state)
			{
				case NumberTokens.start:
					state = NumberTokens.sign;
					break;
				case NumberTokens.digit:
					state = NumberTokens.done;
					break;
				case NumberTokens.expsymbol:
					state = NumberTokens.expsign;
					break;
				default:
					state = NumberTokens.bad;
					break;
			}
		}
		else if ((this.str.charAt(this.pos) == '.') && (state == NumberTokens.digit))
		{
			state = NumberTokens.fraction;
		}
		else if (((this.str.charAt(this.pos) == 'E') || (this.str.charAt(this.pos) == 'e')) && ((state == NumberTokens.digit) || (state == NumberTokens.fraction)))			
		{
			state = NumberTokens.expsymbol;
		}
		else
		{
			state = NumberTokens.bad;
		}
		
		if ((state != NumberTokens.bad) && (state != NumberTokens.done))
		{
			this.buffer += this.str.charAt(this.pos);
			this.pos++;
		}
	}
	this.pos--;
	
	//console.log(this.buffer);
	
	return true; 		
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseString = function()
{		
	this.buffer = '';
	
	this.pos++;
	
	var state = StringTokens.ok;
	while ((state != StringTokens.done) && (this.pos < this.str.length))
	{
		//console.log(this.pos + ' ' + this.str.charAt(this.pos));
		switch (state)
		{
			case StringTokens.ok:
				if (this.str.charAt(this.pos) == "'")
				{
					state = StringTokens.quote;
				}
				else
				{
					this.buffer += this.str.charAt(this.pos);
				}
				break;
				
			case StringTokens.quote:
				if (this.str.charAt(this.pos) == "'")
				{
					this.buffer += this.str.charAt(this.pos);
					state = StringTokens.ok;
				}
				else
				{
					state = StringTokens.done;
					this.pos--;
				}
				break;
				
			default:
				break;
		}			
		this.pos++;
	}
	this.pos--;
	
	//console.log(this.buffer);	
	return (state == StringTokens.done) ? true : false;
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseToken = function()
{
	this.buffer = '';
	
	while (
		this.pos < this.str.length
		&& (!strchr (NEXUSWhiteSpace, this.str.charAt(this.pos)))
			&& (!strchr (NEXUSPunctuation, this.str.charAt(this.pos)))
			)
		{
			this.buffer += this.str.charAt(this.pos);
			this.pos++;
		}
	this.pos--;
	
	//console.log(this.buffer);
	
	return true;
}

//--------------------------------------------------------------------------------------------------
NexusReader.prototype = new Scanner;

//----------------------------------------------------------------------------------------------
function NexusReader()
{
	Scanner.apply(this, arguments);
	
	this.nexusCommands = ['begin', 'dimensions', 'end', 'endblock', 'link', 'taxa', 'taxlabels', 'title', 'translate', 'tree'];
	this.nexusBlocks = ['taxa', 'trees'];
};

//----------------------------------------------------------------------------------------------
NexusReader.prototype.GetBlock = function()
{
	var blockname = '';
	
	var command = this.GetCommand();
	
	//console.log('GetBlock: ' + this.buffer + ' ' + command);	 

	if (command.toLowerCase() != 'begin')
	{
		this.error = NexusError.nobegin;
	}
	else
	{
		// get block name
		var t = this.GetToken();
		
		//console.log('GetCommand: ' + this.buffer);		
		if (t == TokenTypes.String)
		{
			blockname = this.buffer.toLowerCase();
			t = this.GetToken();
			if (t != TokenTypes.SemiColon)
			{
				this.error = NexusError.noblockname;
			}
		}
		else
		{
			this.error = NexusError.noblockname;
		}
		
	}
	return blockname.toLowerCase();
}

//----------------------------------------------------------------------------------------------
NexusReader.prototype.GetCommand = function()
{
	var command = '';
	
	var t = this.GetToken();
	
	//console.log('GetCommand: ' + this.buffer);
	
	if (t == TokenTypes.String)
	{
		if (this.nexusCommands.indexOf(this.buffer.toLowerCase()) != -1)
		{
			command = this.buffer.toLowerCase();
		}
		else
		{
			this.error = NexusError.badcommand;
		}
	}
	else
	{
		this.error = NexusError.syntax;
	}
	return command.toLowerCase();
}
	
//----------------------------------------------------------------------------------------------
NexusReader.prototype.IsNexusFile = function()
{
	this.error = NexusError.ok;
	
	var nexus = false;
	var t = this.GetToken();
	if (t == TokenTypes.Hash)
	{
		t = this.GetToken();
		if (t == TokenTypes.String)
		{
			nexus = ( this.buffer.toLowerCase() == 'nexus') ? true : false;
		}
	}
	return nexus;
}

//----------------------------------------------------------------------------------------------
NexusReader.prototype.SkipCommand = function()
{	
	var t = null;
	do {
		t = this.GetToken();
	} while ((this.error == NexusError.ok) && (t != TokenTypes.SemiColon));
	return this.error;
}

//--------------------------------------------------------------------------------------------------
function parse_nexus(str)
{
	var nexus = {};
	
	nexus.status = NexusError.ok;
	
	var nx = new NexusReader(str);

	if (nx.IsNexusFile()) 
	{
		//console.log('Is a NEXUS file');		
	}
		
	var blockname = nx.GetBlock();
	
	//console.log("BLOCK="+blockname);
	
		
	if (blockname == 'taxa')
	{
		var command = nx.GetCommand();
		
		while ( 
			(command != 'end') 
			&& (command != 'endblock')
			&& (nx.error == NexusError.ok)
			)
		{		
			switch (command)
			{
				case 'taxlabels':
					var t = nx.GetToken();
					while (t !==4){
						nx.taxa[nx.buffer]={}
						t = nx.GetToken();
					
					}
					
					command = nx.GetCommand();
					break;	
					
				default:
					//echo "Command to skip: $command\n";
					nx.SkipCommand();
					command = nx.GetCommand();
					break;
			}
			
			// If end command eat the semicolon
			if ((command == 'end') || (command == 'endblock'))
			{
				nx.GetToken();
			}
		}
		
		blockname = nx.GetBlock();
					
	}
	
	
	if (blockname == 'trees')
	{
		nexus.treesblock = {};
		nexus.treesblock.trees = [];
		
		command = nx.GetCommand();
				
		while ( 
			((command != 'end') && (command != 'endblock'))
			&& (nx.error == NexusError.ok)
			)
		{
			// console.log(command);
			
			switch (command)
			{
				case 'translate':
				
					// translation table is an associative array
					nexus.treesblock.translate = {};
					
					var done = false;
					while (!done && (nx.error == NexusError.ok))
					{
						var t = nx.GetToken();
						
						if ([TokenTypes.Number, TokenTypes.String, TokenTypes.QuotedString].indexOf(t) != -1)
						{
							var otu = nx.buffer;
							t = nx.GetToken();
							
							if ([TokenTypes.Number, TokenTypes.String, TokenTypes.QuotedString].indexOf(t) != -1)
							{
								// cast otu to string 
								nexus.treesblock.translate[String(otu)] = nx.buffer;
								
								//console.log(otu + ' ' + nx.buffer);
								
								t = nx.GetToken();
								switch (t)
								{
									case TokenTypes.Comma:
										break;
										
									case TokenTypes.SemiColon:
										done = true;
										break;
										
									default:
										nx.error = NexusError.syntax;
										break;
								}
							}
							else
							{
								nx.error = NexusError.syntax;
							}
						}
						else
						{
							nx.error = NexusError.syntax;
						}
					}					
					
					command = nx.GetCommand();
					break;
					
				case 'tree':	
					if (command == 'tree')
					{
						var tree = {};
						
						t = nx.GetToken();
						if (t == TokenTypes.Asterix)
						{
							tree.default = true;
							t = nx.GetToken();
						}
						if (t == TokenTypes.String)
						{
							tree.label = nx.buffer;
						}
						t = nx.GetToken();
						if (t == TokenTypes.Equals)
						{
							tree.newick = '';
							t = nx.GetToken();
							while (t != TokenTypes.SemiColon)
							{
								if (t == TokenTypes.QuotedString)
								{
									var s = nx.buffer;
									s = s.replace("'", "''");
									s = "'" + s + "'";
									tree.newick += s;
								}
								else
								{	
									if (nx.previous_token ==5 || nx.previous_token==6 || nx.previous_token ==9){
	
										if (t==1 || t ==3){
											nx.current_node=nx.buffer
										}
										else if (t==6 || t==9 || t==11){
											nx.current_node='_hypo_'+nx.hypo_node;
											tree.newick+='_hypo_'+nx.hypo_node;
											nx.hypo_node++;
										}
								
									}
									//end of node
									if (t==6 || t==9){
										if (nx.current_comment ){
											nx.node_information[nx.current_node]={};
											var info = nx.current_comment.substring(1,nx.current_comment.length-1);
											while(m=nx.reg_ex.exec(nx.current_comment)){
												 var temp = m[0].replace(",","|")
												 info= info.replace(m[0],temp)
											
											}
											var arr = info.split(",");
											for (var index  in arr){
												var arr2 = arr[index].split("=");
												var value = arr2[1];
												if (arr2[1].startsWith("{")){
													var value = arr2[1].substring(1,arr2[1].length-1).split("|");
													
												}
												nx.node_information[nx.current_node][arr2[0]]=value;
												
											}
										}
										
										
										nx.current_comment="";
										nx.current_node="";
									}
									tree.newick += nx.buffer;
								}
								nx.previous_token = t;
								t = nx.GetToken();
								
							}
							tree.newick += ';';
							
							nexus.treesblock.trees.push(tree);
						}
						
					}				
					command = nx.GetCommand();
					break;
	
				default:
					//echo "Command to skip: $command\n";
					nx.SkipCommand();
					command = nx.GetCommand();
					break;
			}
			
			// If end command eat the semicolon
			if ((command == 'end') || (command == 'endblock'))
			{
				nx.GetToken();
			}
			
			
		}
	
	}
	
	nexus.status = nx.error;
	nexus.nodes=nx.nodes;
	nexus.node_information=nx.node_information;
	return nexus;
}









D3BaseTree.prototype = Object.create(null);
D3BaseTree.prototype.constructor=D3BaseTree;


/**
*  The base class for trees
* @constructor
* @param {string} element_id - The id of the container for the tree
* @param {object} metadata - (optional ) An object describing the trees metadata see {@link D3BaseTree#addMetadata}
* @param {integer} height - the initial height. The container will be reisized to this height. If absent, the height of the container will be used
* @param {integer} width - the initial width. The container will be reisized to this width If absent, the width of the container will be used
*
*/
function D3BaseTree(element_id,metadata,height,width){
	var self=this;
	this.legend_div = document.createElement('div');
	this.legend_div.classList.add('tree-legend-div');
	Object.assign(this.legend_div.style, { position: 'absolute', overflowX: 'hidden', top: '0px', right: '0px' });
	gtiz_drag.makeFreeDraggable(this.legend_div, { cancel: '.no-drag' });
	this.scale_div = document.createElement('div');
	this.scale_div.classList.add('tree-scale-div');
	Object.assign(this.scale_div.style, { position: 'absolute', overflowX: 'hidden', overflowY: 'hidden', bottom: '100px', left: '20px' });
	gtiz_drag.makeFreeDraggable(this.scale_div);
	this.container = document.getElementById(element_id);
	this.container.style.position = 'fixed';
	this.container.appendChild(this.legend_div);
	this.container.appendChild(this.scale_div);

	this.height=height;
	this.width=width;
	if (this.width || this.height){
		this.container.style.width = width + 'px';
		this.container.style.height = height + 'px';
	}
	else{
		var size = gtiz_utils.measureSize(this.container);
		this.height = size.height;
		this.width = size.width;
	}

	this.metadata={};
	this.metadata_info = {nothing:{label:"No Category"}};
	this.grouped_nodes={};
	this.metadata_map={};
	if (metadata){
		this.addMetadata(metadata);
	}
	this.show_legend=true;
	
	// Canvas layer: the mass of nodes and links is rendered here (see
	// canvas_renderer.js). It sits UNDER the SVG overlay and never receives
	// pointer events (those go to the SVG background rect that drives zoom).
	this.render_canvas = document.createElement('canvas');
	this.render_canvas.setAttribute('id', 'mst-canvas');
	Object.assign(this.render_canvas.style, { position: 'absolute', top: '0px', left: '0px', zIndex: '1', pointerEvents: 'none' });
	this.container.appendChild(this.render_canvas);

	this.svg = d3.select("#"+element_id).append('svg')
	 .attr("width",this.width)
	.attr("height",this.height)
	.attr("id","mst-svg")
	.style("position", "absolute").style("top", "0px").style("left", "0px").style("z-index", "2");

	// Lift the floating panels above both canvas and svg layers.
	this.legend_div.style.zIndex = '3';
	this.scale_div.style.zIndex = '3';

	// The renderer is a pure consumer of the tree model (coordinates, radii,
	// pie composition, colours). It is created here so subclasses (D3MSTree)
	// can request redraws as soon as the model changes.
	this.renderer = new D3MSTreeCanvasRenderer(this, this.render_canvas);
	this.renderer.resize(this.width, this.height);

	this.svg.append('defs').html('<pattern id="pattern" patternUnits="userSpaceOnUse" width="8" height="8"> <image href="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI2LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAzOC40IDM4LjQiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDM4LjQgMzguNDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiNGRkZGRkY7fQoJLnN0MXtmaWxsOiNCREJEQkQ7fQo8L3N0eWxlPgo8cmVjdCB5PSIwIiBjbGFzcz0ic3QwIiB3aWR0aD0iMzguNCIgaGVpZ2h0PSIzOC40Ii8+CjxjaXJjbGUgY2xhc3M9InN0MSIgY3g9IjE5LjIiIGN5PSIxOS4yIiByPSI4LjUiLz4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTM4LjQsOC41VjBIMzBDMzAsNC43LDMzLjcsOC41LDM4LjQsOC41eiIvPgo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMzguNCwzMGMtNC43LDAtOC41LDMuOC04LjUsOC41aDguNVYzMHoiLz4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTguNSwwSDB2OC41QzQuNyw4LjUsOC41LDQuNyw4LjUsMHoiLz4KPHBhdGggY2xhc3M9InN0MSIgZD0iTTAsMzB2OC41aDguNUM4LjUsMzMuNyw0LjcsMzAsMCwzMHoiLz4KPC9zdmc+Cg==" x="0" y="0" width="8" height="8"> </image> </pattern>');
	
	//legend stuff
	this.node_map={};
	this.legend=null;
	this.legend_background;
	this.objColors = {};
	// d3 v4+ removed the categorical palette helpers (scale.category20/20b/20c),
	// so their original ranges are inlined here to preserve the same colours.
	var category20 = ["#1f77b4","#aec7e8","#ff7f0e","#ffbb78","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5","#8c564b","#c49c94","#e377c2","#f7b6d2","#7f7f7f","#c7c7c7","#bcbd22","#dbdb8d","#17becf","#9edae5"];
	var category20b = ["#393b79","#5254a3","#6b6ecf","#9c9ede","#637939","#8ca252","#b5cf6b","#cedb9c","#8c6d31","#bd9e39","#e7ba52","#e7cb94","#843c39","#ad494a","#d6616b","#e7969c","#7b4173","#a55194","#ce6dbd","#de9ed6"];
	var category20c = ["#3182bd","#6baed6","#9ecae1","#c6dbef","#e6550d","#fd8d3c","#fdae6b","#fdd0a2","#31a354","#74c476","#a1d99b","#c7e9c0","#756bb1","#9e9ac8","#bcbddc","#dadaeb","#636363","#969696","#bdbdbd","#d9d9d9"];
	this.color_schemes = {
		category: category20.concat(
			category20b, category20c,
			["#FFFF00","#1CE6FF","#FF34FF","#FF4A46","#008941","#006FA6","#A30059","#FFDBE5","#7A4900","#0000A6","#63FFAC","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601",
			 "#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101",
			 "#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459",
			 "#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7",
			 "#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98",
			 "#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5",
			 "#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325",
			 "#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F",
			 "#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749",
			 "#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A",
			 "#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC",
			 "#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2",
			 "#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F",
			 "#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"])
		, 
		category2: 
			["#FFFF00","#1CE6FF","#FF34FF","#FF4A46","#008941","#006FA6","#A30059","#FFDBE5","#7A4900","#0000A6","#63FFAC","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601",
			 "#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101",
			 "#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459",
			 "#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7",
			 "#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98",
			 "#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5",
			 "#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325",
			 "#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F",
			 "#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749",
			 "#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A",
			 "#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC",
			 "#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2",
			 "#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F",
			 "#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"].concat(
				category20, category20b, category20c)
		,
		custom: category20.concat(
			category20b, category20c),
		gradient_cool: function(num) {
			var n = num - 1;
			var scale = d3.scaleLinear()
				.domain([0, n/4, n/2, n*3/4, n])
				.range(["#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#00007D"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient: function(num) {
			var n = num - 1;
			var scale = d3.scaleLinear()
				.domain([0, n/4, n*3/4, n])
				.range(["#FFFF7D", "#FFFF00", "#FF0000", "#7D0000"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow: function(num) {
			var n = num - 1;
			var scale = d3.scaleLinear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow2: function(num) {
			var n = num - 1;
			var scale = d3.scaleLinear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#FFAFAF", "#FFFFAF", "#AFFFAF", "#AFFFFF", "#AFAFFF", "#FFAFFF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow3: function(num) {
			var n = num - 1;
			var scale = d3.scaleLinear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#AF0000", "#AFAF00", "#00AF00", "#00AFAF", "#0000AF", "#AF00AF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		}
	};
	// Generate the categorical palette on demand (distinct HSL hues via
	// golden-angle rotation) instead of using the fixed array above, so the
	// legend is never capped at the palette length: every group up to
	// `category_num` gets its own colour. Deterministic (same count -> same
	// colours across redraws). The gradient_* schemes are left untouched.
	this.color_schemes.category = function(num) {
		var colors = [];
		var golden = 137.508; // golden angle -> maximally spread, distinct hues
		var hslToHex = function(h, s, l) {
			s /= 100; l /= 100;
			var c = (1 - Math.abs(2 * l - 1)) * s;
			var x = c * (1 - Math.abs((h / 60) % 2 - 1));
			var m = l - c / 2;
			var r = 0, g = 0, b = 0;
			if (h < 60) { r = c; g = x; }
			else if (h < 120) { r = x; g = c; }
			else if (h < 180) { g = c; b = x; }
			else if (h < 240) { g = x; b = c; }
			else if (h < 300) { r = x; b = c; }
			else { r = c; b = x; }
			var toHex = function(v) { var n = Math.round((v + m) * 255); return ('0' + n.toString(16)).slice(-2); };
			return '#' + toHex(r) + toHex(g) + toHex(b);
		};
		for (var i = 0; i < num; i++) {
			var hue = (i * golden) % 360;
			var sat = 65 + (i % 2) * 20;   // alternate 65% / 85% saturation
			var light = 45 + (i % 3) * 12; // cycle 45% / 57% / 69% lightness
			colors.push(hslToHex(hue, sat, light));
		}
		return colors;
	};
	//this.legend_colours = ['default', this.color_schemes.default];
	this.category_num = 30;
	this.default_colour= "white";
	this.category_colours={};
	this.display_category=null;
	this.custom_colours={}
	//date stuff
	this.timeFormat= d3.timeFormat("%Y-%m-%d");
	this.timeParse= d3.timeParse("%Y-%m-%d");
	this.min_date=null;
	this.max_date=null;
	this.date_scale=null;
	// this.calculateDateScale();
	this.treeChangedListeners=[];
	this.nodesSelectedListeners=[];
	this.displayChangedListeners=[];
	
	//Zooming and translating
	this.scale=1;
	this.translate=[0,0];
	
	// d3 v4+ zoom uses a single transform (x, y, k) instead of separate
	// translate/scale accessors. this.scale / this.translate are kept in sync
	// from the zoom event so the rest of the code can keep reading them.
	this.zoom = d3.zoom()
		// Shift is reserved for the selection brush, so the zoom/pan behaviour
		// must ignore Shift gestures (otherwise it competes with the brush and
		// the drag is consumed by the pan). Wheel zoom stays enabled.
		.filter(function(event){
			if (event.shiftKey || event.button) {
				return false;
			}
			if (event.type === 'wheel') {
				// Wheel always zooms, even when the pointer is over a node.
				return true;
			}
			if (event.ctrlKey) {
				return false;
			}
			// On press, let node dragging take precedence when a node is hit;
			// otherwise the gesture pans the canvas.
			if (self._nodeUnderEvent && self._nodeUnderEvent(event)) {
				return false;
			}
			return true;
		})
		.on('zoom', function(event){
			var t = event.transform;
			self.canvas.attr('transform', "translate(" + t.x + "," + t.y + ") scale(" + t.k + ")");
			self.scale = t.k;
			self.translate = [t.x, t.y];
			self.updateScaleDiv();
			// Keep the canvas layer aligned with the SVG overlay transform.
			if (self.renderer) {
				self.renderer.requestRedraw();
			}
		});

	this.background_rect = this.svg.append('rect')
		.attr("pointer-events","all")
		.style('fill', 'none')
		.attr("width", this.width)
		.attr("height", this.height)
		.call(this.zoom)
		.on("dblclick.zoom", null);
	
	this.canvas = this.svg.append("g");
	this.canvas.attr("id","vis");

	// Canvas interaction layer. The browser no longer hit-tests per-element SVG
	// shapes, so a quadtree (in the renderer) tells us which node/link is under
	// the pointer. Node dragging and hover tooltips are routed through it to the
	// existing handlers; the drag math and selection logic are unchanged.
	this.node_drag = d3.drag()
		.filter(function(event){
			return !event.shiftKey && !event.button && self._nodeUnderEvent(event);
		})
		.subject(function(event){
			return self._nodeUnderEvent(event);
		})
		.on('start', function(event){
			if (event.subject && self._dragStarted) {
				self._dragStarted(event.subject);
			}
		})
		.on('drag', function(event){
			// d3.drag deltas are in screen pixels here (the rect is unscaled),
			// so convert to data units before feeding the existing _dragging.
			if (event.subject && self._dragging) {
				self._dragging(event.subject, null, { dx: event.dx / self.scale, dy: event.dy / self.scale });
			}
		})
		.on('end', function(event){
			if (event.subject && self._dragEnded) {
				self._dragEnded(event.subject);
			}
		});
	this.background_rect.call(this.node_drag);

	// Hover -> tooltip. Pick the node (then the wedge under the cursor) or a
	// nearby link, and notify the same listeners the SVG handlers used to call.
	this.svg.on('mousemove.hover', function(event){
		self._handleHover(event);
	}).on('mouseleave.hover', function(){
		self._fireHoverOut();
	});
	//resize
	/*$(window).resize(function(){
		setTimeout(function(){
			self.resize();
		},100);
	});*/

	this.legend_div_new = document.querySelector('.card-legend');
	
	//keydown
	d3.select('body').on("keydown",function(e){
		self._keyDown(e);
	}).on("keyup",function(e){
		// tear down the manual brush and any in-flight drag listeners
		d3.select(window).on("mousemove.brush", null).on("mouseup.brush", null);
		d3.selectAll(".brush").remove();
	});

}

/** Request a redraw of the canvas layer (coalesced to one draw per frame). */
D3BaseTree.prototype.requestRedraw = function(){
	if (this.renderer){
		this.renderer.requestRedraw();
	}
};

/**
 * Convert a pointer event to data-space coordinates (the space where node.x /
 * node.y live), inverting the current zoom/pan transform.
 */
D3BaseTree.prototype._pointerData = function(event){
	var p = d3.pointer(event, this.svg.node());
	return [(p[0] - this.translate[0]) / this.scale, (p[1] - this.translate[1]) / this.scale];
};

/** Return the node under a pointer event, or null. Used to arbitrate drag vs pan. */
D3BaseTree.prototype._nodeUnderEvent = function(event){
	if (!this.renderer){
		return null;
	}
	var d = this._pointerData(event);
	return this.renderer.pickNode(d[0], d[1]);
};

/**
 * Hover handler: pick a node (and the wedge under the cursor) or a nearby link
 * and forward to the same listeners the old per-element SVG handlers used.
 */
D3BaseTree.prototype._handleHover = function(event){
	if (this.dragging || !this.renderer){
		return;
	}
	var d = this._pointerData(event);
	var node = this.renderer.pickNode(d[0], d[1]);
	if (node){
		// Fire the "over" listeners only when the hovered node CHANGES (mimicking
		// the SVG mouseover, which fired once on enter). Firing on every mousemove
		// would call showToolTip repeatedly, leaking a tooltip div each time.
		if (this._hover_node === node){
			return;
		}
		this._fireHoverOut();
		this._hover_node = node;
		var wedge = this.renderer.pickWedge(node, d[0], d[1]);
		if (this.segment_over_listeners){
			for (var i in this.segment_over_listeners){
				this.segment_over_listeners[i](wedge, event);
			}
		}
		return;
	}
	var link = this.renderer.pickLink(d[0], d[1], 4 / this.scale);
	if (link){
		if (this._hover_link === link){
			return;
		}
		this._fireHoverOut();
		this._hover_link = link;
		if (this.link_over_listeners){
			for (var j in this.link_over_listeners){
				this.link_over_listeners[j](link, event);
			}
		}
		return;
	}
	this._fireHoverOut();
};

/** Fire the out listeners for whatever element was last hovered. */
D3BaseTree.prototype._fireHoverOut = function(){
	if (this._hover_node && this.segment_out_listeners){
		for (var i in this.segment_out_listeners){
			this.segment_out_listeners[i](this._hover_node);
		}
	}
	this._hover_node = null;
	if (this._hover_link && this.link_out_listeners){
		for (var j in this.link_out_listeners){
			this.link_out_listeners[j](this._hover_link);
		}
	}
	this._hover_link = null;
};

D3BaseTree.prototype.parseNewick =  function (a, taxa_map){
	this.newickTree = a;
	for(var e=[],r={},s=a.split(/\s*(;|\(|\)|,|:)\s*/),t=0;t<s.length;t++){
		var n=s[t];
		switch(n){
			case"(":var c={};r.children=[c],e.push(r),r=c;break;
			case",":var c={};e[e.length-1].children.push(c),r=c;break;
			case")":r=e.pop();break;
			case":":break;
			default: {
				var h=s[t-1];
				")"===h||"("===h||","===h ? (r.name=taxa_map && taxa_map[n] ? taxa_map[n] : n) : ":"===h && (r.length=parseFloat(n));
			}
		}
	}
	return r;
};
D3BaseTree.prototype.parseNexus =  function (tre){
	var a1 = tre.split(/begin trees;\s+/)[1];
	var taxa_map = {};
	if (a1.search('translate') >= 0) {
		var aa = a1.split(';');
		var [a3, a2] = [aa[0], aa[1]];
		for (var a4=a3.split(/[\s,]+/), t=1; t+1 <a4.length; t+= 2) {
			taxa_map[a4[t]] = a4[t+1];
		}
	} else {
		var [a3, a2] = [null, a1.split(';')[0]];
	}
	var a2 = ['(', a2.split(/^[^(]+\(/)[1], ';'].join('').split(/(\[|\])/);
	var a = [];
	for (var a = [], t=0, inNote=0; t < a2.length; t ++) {
		var n = a2[t];
		switch(n) {
			case"[": inNote = 1; break;
			case"]": inNote = 0; break;
			default: if (! inNote) a.push(n);
		}
	}
	return this.parseNewick(a.join(''), taxa_map);
};







D3BaseTree.prototype.readNexusFile = function (text){
	var nexus=parse_nexus(text);
	var newick = nexus.treesblock.trees[0].newick;
	var root= this.parseNewick(newick,nexus.treesblock.translate);
	return {"root":root,"translate":nexus.treesblock.translate,"node_information":nexus.node_information};
}



/**
* Adds metadata to the tree 
* @param {object} metadata - An object containing id to a list of key value pairs.If there is
* a one to one relationship beteween the nodes and metadata, then the id should correspond 
* to the node id e,g,
* <pre>
* {
*	node_a:{year:"1987",color:"red"},
*	node_b:{.....}
*	,....
* } 
* </pre>
* If a node reprsents several entities e.g.an ST has several strins, then an ID property is required,
* which is the ID of node e.g.
* <pre>
* {
	strain_a:{year:"1988",virulence:"high",ID:"ST27"},
	strain_b:{year:"1987",virulence:"low",ID:"ST27"},
	strain_c:{year:"1989",virulence:"medium",ID:"ST28"},
	....
* }
* </pre>
* If the id already exists, than new properties will be added or existing ones altered e.g.
* <pre>
* {
* strain_a:{year:"1999",new_category:"value1"}
* }
* </pre>
*/

/**
* Deletes the specified category from all metadata
* @param {string} The category to delete
*/
D3BaseTree.prototype.removeCategory=function(category){
	for (var key in this.metadata){
		var item = this.metadata[key];
		delete item[category];
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_altered",this);	
	}	
};


/**
* Resizes the tree components based on the size of the container
* This method is automatically called if the window is resized,
* but should be called if the container is resized manually
*/

/*D3BaseTree.prototype.resize=function(){
	this.width = this.container.width();
	this.height = this.container.height();
	this.svg.attr('width', this.width).attr('height', this.height);
	var x_scale = d3.scale.linear().domain([0, this.width]).range([0, this.width]);
	var y_scale = d3.scale.linear().domain([0, this.height]).range([0, this.height]);
	var temp_scale=this.zoom.scale();
	var temp_trans=this.zoom.translate();
	this.zoom.x(x_scale).y(y_scale);
	this.zoom.scale(temp_scale);
	this.zoom.translate(temp_trans);
	this.background_rect.attr('height', this.height).attr('width', this.width);
	//this.legend_div.css({"top":"0px","right":"0px"});
	if (this.legend_div.position().top < 0) {
		this.legend_div.css({"top":"0px"});
	}
	if (this.legend_div.position().left > this.width-300) {
		this.legend_div.css({"left":this.width-300});
	}
	//this.updateScaleDiv();
	if (this.scale_div.position().top < 0) {
		this.scale_div.css({"top":"0px"});
	}
	if (this.scale_div.position().left > this.width-300) {
		this.scale_div.css({"left":this.width-300});
	}
};*/

/** Sets the scale (size of the tree)
* @param {float} scale - The scale to set e.g 2
* @param {boolean} relative - If true than the current scale will be multiplied by the scale parameter e.g 0.5,true
* would halve the current size of the tree
*/
D3BaseTree.prototype.setScale=function(scale,relative){
	if (relative){
		scale *= this.scale;
	}
	var t = d3.zoomIdentity.translate(this.translate[0], this.translate[1]).scale(scale);
	this.background_rect.call(this.zoom.transform, t);
};


/** Sets the translate (offset of the tree)
* @param {array} scale - An array containing the x,y offsets eg [30,-100]
*/
D3BaseTree.prototype.setTranslate=function(x_y){
	var t = d3.zoomIdentity.translate(x_y[0], x_y[1]).scale(this.scale);
	this.background_rect.call(this.zoom.transform, t);
}


D3BaseTree.prototype._changeCategory=function(category){
	var self = this;
	if (! this.metadata_info) this.metadata_info = {};
	if (!(category in this.metadata_info)) this.metadata_info[category] = {}
	if (! this.metadata_info[category].coltype) this.metadata_info[category].coltype = 'character';
	if (! this.metadata_info[category].grouptype) this.metadata_info[category].grouptype = 'size';
	if (! this.metadata_info[category].colorscheme) this.metadata_info[category].colorscheme = 'category';
	if (! this.metadata_info[category].minnum) this.metadata_info[category].minnum = 0;
	if (! this.metadata_info[category].category_num) this.metadata_info[category].category_num = 30;

	var coltype = this.metadata_info[category].coltype;
	var grouptype = this.metadata_info[category].grouptype;
	var colorscheme = this.metadata_info[category].colorscheme;
	var minnum = this.metadata_info[category].minnum;
	var category_num = this.metadata_info[category].category_num;

	var cust_col = this.custom_colours[category];
	this.display_category = category;
	var cat_count = {};
	if (category != 'nothing') {
		cat_count = Object.values(this.metadata)
			.filter(function(d) {return (d.ID in self.node_map) })
			.map(function(d) {return d[category]})
			.filter(function(d) {return (d || d === 0)})
			.reduce(function(c, d) {c[d] = d in c ? c[d]+1:1; return c}, {});
	} else if (category === 'nothing') { // added to manage **No category** selection and to populate anyway legend
		let m = {...this.metadata};
		Object.values(m).forEach(el => {
			el['nothing'] = 'nothing';
		});
		cat_count = Object.values(m)
			.filter(function(d) {return (d.ID in self.node_map) })
			.map(function(d) {return d['nothing']})
			.filter(function(d) {return (d || d === 0)})
			.reduce(function(c, d) {c[d] = d in c ? c[d]+1:1; return c}, {});
	}

	var cat_count_list = Object.entries(cat_count)
		.filter(function(ent) {
			return ent[1] >= minnum;
		})
		.map(function(ent) {
			if (coltype != 'character' && isNumber(ent[0])) {
				return [parseFloat(ent[0]), ent[1], '', 0];
			} else {
				return [ent[0], ent[1], '', 0];
			}
		})
		.sort(function(a,b){
			if (grouptype != 'size') {
				if (gtiz_legend.group_order) {
					if (gtiz_legend.group_order.sort == 'desc') {
						let c = a;
						a = b;
						b = c; // inverting order
					}
				}
				return (a[3] == b[3]) ? (a[0]>=b[0]?1:-1) : a[3]-b[3];
			} else {
				if (gtiz_legend.group_order) {
					if (gtiz_legend.group_order.sort == 'asc') {
						let c = a;
						a = b;
						b = c; // inverting order
					}
				}
				return (a[1] == b[1]) ? ((a[3] == b[3]) ? (a[0]>=b[0]?1:-1) : a[3]-b[3]) : (a[1]<b[1]?1:-1);
			}
		});


	this.category_colours = {};
	var color_num = cat_count_list.length > category_num ? category_num : cat_count_list.length;

	try {
		var auto_col = this.color_schemes[colorscheme](color_num);
	} catch (e) {
		var auto_col = this.color_schemes[colorscheme];
	}

	for (var colour_count in cat_count_list){
		var val = cat_count_list[colour_count][0];

		if (cust_col && cust_col[val]){
			this.category_colours[val]=cust_col[val];
			cat_count_list[colour_count][2] = cust_col[val];
			continue;	
		} else if (! auto_col[colour_count] || colour_count >= color_num) {
			cat_count_list[colour_count][2] = this.category_colours[val] = ''; //this.default_colour;
		} else {
			cat_count_list[colour_count][2] = this.category_colours[val] = auto_col[colour_count];
		}
	}
	//this.category_colours["Others"] = this.default_colour;

	this.updateLegend(category, cat_count_list);
	this.setCategoryColors(category, cat_count_list);
	for (var i in this.displayChangedListeners){
		this.displayChangedListeners[i]("category_changed",category);
	
	}
	
}

/**
* Retreives metadata
* @returns {object} An object containing id to a list of key value pairs see {@link D3BaseTree#addMetadata}

*/
D3BaseTree.prototype.getMetadata=function(){
	return this.metadata;
};           

/**
* Searches the metadata values associated 
* with the node for the keyword
* @param {string} keyword The word to use for the search
* @param {string} The  key )field of the metadata to search.
* if not provides will search all fields
* @returns {list} All the node ids where the keyword was found
*/
D3BaseTree.prototype.searchMetadata=function(keyword, key){
	var ids = [];
	var exp = new RegExp(keyword,"i");
	for (var id in this.grouped_nodes){
		var contains = false;
		var list = this.grouped_nodes[id];
		for (var i in list){
			var meta_id = this.metadata_map[list[i]];
			if (meta_id){
				var metadata= this.metadata[meta_id];
				var contains = false
				if (!key){
					for (var field in metadata){
						if (metadata[field]){
							var look = metadata[field]+"";
							if (look.match(exp)){
								ids.push(id);
								contains=true;
								break;
							}
						}
						
					}
				}
				else{
					if (metadata[key]){
							var look = metadata[key]+"";
							if (look.match(exp)){
								ids.push(id);
								contains=true;
							}
					}					
				}
				if (contains){
					break;
				}
			}
		}
		
	}
	return ids;

}

D3BaseTree.prototype.getAllIDs=function(){
	var ids =[];
	for (var id in this.metadata){
		if (id.startsWith("_hypo_")){
			continue;
		}
		ids.push(id);      
	}      
	return ids;
}

/**
* Hide/Show the menu
* @param {boolean} show If true the menu will be shown
*/
D3BaseTree.prototype.showLegend= function (show){
	this.show_legend=show;
	if (show){
		this.legend_div.style.display = 'block';
	}
	else{
		this.legend_div.style.display = 'none';
	}

};

D3BaseTree.prototype._updateScaleDivSize = function(scaleLength) {
	var d_scale = this.distance_scale ? this.distance_scale(1) : this.xScale(1);
	var scaleValue = scaleLength/this.scale/d_scale;
	var digit = -Math.floor(Math.log10(scaleValue));
	var scaleValue = digit > 0 ? scaleValue.toFixed(digit) : Math.round(scaleValue/Math.pow(10, -digit))*Math.pow(10, -digit);
	var scaleLength = scaleValue*d_scale*this.scale;
	return {scaleValue:scaleValue, scaleLength:scaleLength};
}



D3BaseTree.prototype.updateScaleDiv = function() {
	var self = this;
	var dim = this._updateScaleDivSize(100);
	d3.select(this.scale_div).select("svg").remove();
	var scale_svg = d3.select(this.scale_div).append('svg').attr("id","scale-svg");
	var scale = scale_svg.append("g").attr('class', 'scale-bar');
	scale.selectAll('.scale-title').remove();
	scale.append('text').attr('class', 'scale-title').attr('x', 30).attr('y', 20).attr('font-weight', 'normal').attr("font-family", (gtiz_utils.getAllCssVariables()["--font-family"] || "Arial"))
	.text(dim.scaleValue);
	scale.append('line').attr('x1', 0).attr('y1', 25).attr('x2', dim.scaleLength).attr('y2', 25).attr("stroke-width", 1).attr("stroke", "black");
	scale.append('line').attr('x1', 0).attr('y1', 20).attr('x2', 0).attr('y2', 25).attr("stroke-width", 1).attr("stroke", "black");
	scale.append('line').attr('x1', dim.scaleLength).attr('y1', 20).attr('x2', dim.scaleLength).attr('y2', 25).attr("stroke-width", 1).attr("stroke", "black");
	var bbox = scale_svg.node().getBBox();
	// While the tree is loading `#graph-div` is `display:none`, so getBBox()
	// reports a zero-width box. Fall back to the known scale-bar length so the
	// container is sized correctly on first render instead of collapsing.
	var content_width = bbox.width > 0 ? bbox.width : Math.max(dim.scaleLength, 30);
	scale_svg.attr("height", 30).attr('width', content_width+10);
	this.scale_div.style.height = '40px';
	this.scale_div.style.width = (content_width+10) + 'px';
}


D3BaseTree.prototype.updateLegend = function(title, ordered_groups){
	var self = this;
	d3.select(this.legend_div).select("svg").remove();

	/**
	 * Modified if condition `if (title == 'nothing' || ! this.display_category)` in order to manage **No category** selection and allow legend object to be populated. We added also following code `_changeCategory` method:
	 * 
	 ```javascript
	 else if (category === 'nothing') {
		let m = {...this.metadata};
		Object.values(m).forEach(el => {
			el['nothing'] = 'nothing';
		});
		cat_count = Object.values(m)
			.filter(function(d) {return (d.ID in self.node_map) })
			.map(function(d) {return d['nothing']})
			.filter(function(d) {return (d || d === 0)})
			.reduce(function(c, d) {c[d] = d in c ? c[d]+1:1; return c}, {});
		}
	 ```
	 * 
	 */
	if (!this.display_category) {
		return;
	}
	var others = 0;
	var legend_data = ordered_groups.filter(function(group) {
		if (group[2] == '') {
			others += group[1];
			return false;
		}
		return true;
	}).map(function(group) {
		return { group: group[0] + '  ['+group[1]+']',
				 group_colour: group[2], 
				 real_group : group[0], 
		};
	});

	if (others) {
		legend_data.push({
			 group:"Others  [" + others + ']',
			 group_colour:this.default_colour, 
			 real_group : 'Others', 
		});
	}

	// remove legend contents
	let legend_card_form = this.legend_div_new.querySelector('.card-form');
	
	let legend_list_box = document.createElement('div');
	legend_list_box.setAttribute('class', 'list-box');
	if (legend_card_form) {
		legend_card_form.innerHTML = '';
		legend_card_form.append(legend_list_box);
	}
	let legend_samples = [];
	legend_data.forEach(element => {
		let samples = parseInt(element.group.match(/\[(\d+)\]/)[1]);
    legend_samples.push(samples);
	});
	// get min and max interval from samples_amount
	let min_samples = Math.min(...legend_samples);
	let max_samples = Math.max(...legend_samples);
	let min_width = 6;
	let max_width = 65;
	let samples_interval = max_samples - min_samples;
	let width_interval = max_width - min_width;
	legend_data.forEach(element => {
		let li = document.createElement('div');
		li.setAttribute('class', 'list-row');
		li.setAttribute('data-category-izsam', self.display_category);
		li.setAttribute('data-real-group-izsam', element.real_group);
		li.setAttribute('data-group-colour-izsam', element.group_colour);
		li.addEventListener('click', function(e) {
			let obj = {
				category : self.display_category,
				value : element.group,
				target : e.target,
				current_target : e.currentTarget,
				real : element.real_group,
				colour : element.group_colour
			};
			self.legendItemClicked(obj);
		});
		let value = document.createElement('div');
		value.setAttribute('class', 'list-value');
		let check = document.createElement('div');
		check.setAttribute('class', 'list-check');
		check.innerHTML = '<i class="tabler tabler-circle"></i>';
		li.appendChild(check);
		let circle = document.createElement('span');
		circle.setAttribute('class', 'card-legend-item-circle');
		circle.style.backgroundColor = element.group_colour;
		circle.addEventListener('click', function(e) {
			let obj = {
				category : self.display_category,
				value : element.group,
				colour : element.group_colour
			};
			self.legendItemCircleClicked(obj);
		});
		value.append(circle);
		let bar = document.createElement('span');
		let samples = parseInt(element.group.match(/\[(\d+)\]/)[1]);
		bar.setAttribute('class', 'card-legend-item-bar');
		bar.style.backgroundColor = element.group_colour;
		if (samples > 0) {
			if (samples == min_samples) {
				let width = min_width;
				bar.style.width = width + '%';
			}
			if (samples == max_samples) {
				let width = max_width;
				bar.style.width = width + '%';
			}
			if ((samples < max_samples) && (samples > min_samples)){
				let width = ((samples * width_interval) / samples_interval) + min_width;
				bar.style.width = width + '%';
			}
		} else {
			bar.style.width = '0%';
		}
		bar.addEventListener('click', function(e) {
			let obj = {
				category : self.display_category,
				value : element.group,
				colour : element.group_colour
			};
			self.legendItemCircleClicked(obj);
		});
		value.append(bar);
		let text = document.createElement('span');
		text.setAttribute('class', 'card-legend-item-text');
		text.innerHTML = element.group.replace('[', '<span class="card-legend-item-text-info">(').replace(']', ')</span>');
		value.appendChild(text);
		li.appendChild(value);
		legend_list_box.append(li);

		let css_vars = gtiz_utils.getAllCssVariables();
		let tooltip_cfg = {
			backgroundColor : css_vars['--secondary-light'],
			color : css_vars['--text'],
		};

		gtiz_tooltip.add(text, tooltip_cfg);

	});

	var legend_svg= d3.select(this.legend_div).append('svg').attr("id","legend-svg");
	var legend = legend_svg.append("g").attr('class', 'legend');
	var legend_items = legend.selectAll('.legend-item').data(legend_data, function(it){
		return it.group;
	});
	legend_items = legend_items.enter().append('g').attr('class', 'legend-item').attr('transform', function(d, i){
		return "translate(0," + ((i + 1) * 24 + 10) + ")";
	}).attr('data-real-group-izsam',  function(it){
		return it.real_group;
	}).attr('data-group-colour-izsam',  function(it){
		return it.group_colour;
	});
	/*
	Create rect elements with group colours
	*/
	legend_items.append('circle').attr('cx', 11).attr('cy',10).attr('r', 8).style('stroke-width', '0.5').style('stroke', 'black').style('fill', function(it){
		return it.group_colour;
	}).on("click",function(event, data){
		var obj={
			category:self.display_category,
			value:data.group,
			colour:data.group_colour
		};
		self.legendItemCircleClicked(obj)

	});
	/*
	Create text elements with group names
	*/
	legend_items.append('text').attr('x', 26).attr('y', 9).attr('dy', ".35em").attr("font-family", (gtiz_utils.getAllCssVariables()["--font-family"] || "Arial")).style('text-anchor', 'start').text(function(it){
		var name = it.group;
		/*if (name.length >25){
			name = name.substring(0,25)+"..."
		}*/
		return name;
	}).on("click",function(event, data){
		var obj={
			category:self.display_category,
			value:data.group,
			target: this,
			real: data.real_group,
			colour:data.group_colour
		};
		console.log(obj);
		self.legendItemClicked(obj)
	});
	/*
	Update the legend title
	*/
	legend.selectAll('.legend-title').remove();
	legend.append('text').attr('class', 'legend-title').attr('x', 12).attr('y', 20).attr('font-weight', 'bold').attr("font-family", (gtiz_utils.getAllCssVariables()["--font-family"] || "Arial"))
	.text(this.metadata_info[title]['label']);
	var legend_dim = legend_svg.node().getBBox();
	legend_svg.attr('width', 240).attr('height', legend_dim.height + 10);
	this.legend_div.style.width = '240px';
	var legend_svg_el = document.getElementById('legend-svg');
	var l_height = legend_svg_el ? legend_svg_el.getBoundingClientRect().height : 0;
	var height = l_height+10;
	
	// Fixed: Prevent infinite height growth during collapse operations
	// Cap maximum height to prevent ui-draggable container from growing uncontrollably
	var max_reasonable_height = this.height * 0.8; // Max 80% of tree container height
	if (height > max_reasonable_height) {
		height = max_reasonable_height;
	}
	
	this.legend_div.style.maxHeight = height + 'px';
	this.legend_div.style.height = height + 'px';

	gtiz_layout.setLegendHeight();
};
	
/**
* Sets the colour for a value in a category e.g. setColour("Country","France","blue")
* @param {string} category The name of the field (category)
* @param {string} value The name of the value
* @param {string} colour The colour to set (usual fomration)
 */
D3BaseTree.prototype.setColour=function(category,value,colour){
	var cat = this.custom_colours[category];
	if (!cat){
		cat =this.custom_colours[category]={};	
	}
	cat[value]=colour;
};	


D3BaseTree.prototype.calculateDateScale= function(){
		var arr = []
		for (var strain in this.metadata){
			if (!this.metadata[strain]['Collection Date']){
				this.metadata[strain]['Collection Date']='ND';
			}
			var date  = this.timeParse(this.metadata[strain]['Collection Date'] )
			arr.push(date);
		}
		var ext = d3.extent(arr);
		var ms_min = Date.parse(ext[0]);
		var ms_max = Date.parse(ext[1]);
		this.min_date = "NA";
		this.max_date='NA'
		if  (ext[0] && ext[1]){
			this.min_date=this.timeFormat(ext[0]);
			this.max_date=this.timeFormat(ext[1]);
			var ms_mid =  ms_min + ((ms_max-ms_min)/2);
			var mid = new Date(ms_mid);
			var st_mid = mid.getFullYear+"-"+(mid.getMonth()+1)+"-"+mid.getDate();
			mid = this.timeParse(st_mid)
			this.date_scale = d3.scaleTime()
			.domain([ext[0],ext[1]])
			.range(["yellow","red"]);
		}
		
};
	
D3BaseTree.prototype._getNodeColour = function(key){
	var strain = this.metadata[key];
	if (!strain){
		return '#ddd'
	}
	var val = strain[this.displayCategory];
	if (!val){
		return '#ddd'
	}
	if (this.displayCategory === 'Collection Date'){
			if (val=== 'ND'){
				return "#ddd"
			}
			return this.date_scale(this.timeParse(val));
	}
	
	return this.category_colours[val];
};


D3BaseTree.prototype._keyDown= function(e){
	var self = this;
	if (e.shiftKey){
		// keydown auto-repeats while Shift is held: only create the brush once
		if (!this.svg.select("g.brush").empty()){
			return;
		}
		// Manual rubber-band selection.
		// d3-brush's internal coordinate mapping (d3.pointer / getScreenCTM)
		// mis-reads the X axis in this dashboard layout, so the selection is
		// computed here from getBoundingClientRect + clientX/clientY (robust DOM
		// APIs unaffected by the SVG CTM). Pixel coords are then converted to the
		// canvas/data space (where node.x / node.y live) by inverting the current
		// zoom transform: data = (pixel - translate) / scale.
		var svgNode = this.svg.node();
		var brushG = this.svg.append("g").attr("class", "brush");
		brushG.append("rect").attr("class", "overlay")
			.attr("x", 0).attr("y", 0)
			.attr("width", this.width).attr("height", this.height)
			.style("fill", "none").style("pointer-events", "all").style("cursor", "crosshair");
		var rect = brushG.append("rect").attr("class", "selection")
			.style("fill", "#777").style("fill-opacity", 0.3)
			.style("stroke", "#fff").style("shape-rendering", "crispEdges")
			.style("display", "none");

		var toData = function(p){
			return [(p[0] - self.translate[0]) / self.scale, (p[1] - self.translate[1]) / self.scale];
		};
		var getXY = function(ev){
			var r = svgNode.getBoundingClientRect();
			return [ev.clientX - r.left, ev.clientY - r.top];
		};
		var start = null, dragging = false;
		var onMove = function(ev){
			if (!dragging) return;
			var cur = getXY(ev);
			var x0 = Math.min(start[0], cur[0]), y0 = Math.min(start[1], cur[1]);
			var x1 = Math.max(start[0], cur[0]), y1 = Math.max(start[1], cur[1]);
			rect.style("display", null).attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0);
			self.brushing([toData([x0, y0]), toData([x1, y1])]);
		};
		var onUp = function(ev){
			if (!dragging) return;
			dragging = false;
			d3.select(window).on("mousemove.brush", null).on("mouseup.brush", null);
			var cur = getXY(ev);
			var x0 = Math.min(start[0], cur[0]), y0 = Math.min(start[1], cur[1]);
			var x1 = Math.max(start[0], cur[0]), y1 = Math.max(start[1], cur[1]);
			self.brushEnded([toData([x0, y0]), toData([x1, y1])]);
			rect.style("display", "none");
		};
		brushG.select(".overlay").on("mousedown", function(ev){
			ev.preventDefault();
			start = getXY(ev);
			dragging = true;
			self.brushStarted();
			d3.select(window).on("mousemove.brush", onMove).on("mouseup.brush", onUp);
		});
	}
	else{
		self.keyPressed(e);
	}
};


/**
* Adds the options available for metadata categories
* @param {object}Can either be  a key to label of metadata categories
* e.g. {collection_data:"Collection date","strain_name":"Name",....}
* or a key to an object containing information about the field
* <ul>
* <li> label the name of the field - required </li>
* <li>coltype - default character </li>
* <li> grouptype - default size </li>
* <li> colorscheme - default category </li>
* <li> cateogory The name of the category to group this field default is none </li>
* </ul>
*/
D3BaseTree.prototype.addMetadataOptions=function(options){
	for (var key in options){
		var value = options[key];
		if ( value !== null && typeof value === 'object'){
			if (!value["coltype"]){
				value['coltype']='character';			
			}
			if (!value["grouptype"]){
				value['grouptype']='size';			
			}
			if(!value["colorscheme"]){
				value['colorscheme']='category';
			}
			if (! value["minnum"]) {
				value['minnum'] = 0;
			}
			
			this.metadata_info[key] =value
		}
		else if (this.metadata_info[key]) {
			delete options[key];
		}
		else{
			this.metadata_info[key]={
				label:options[key],
				coltype : 'character', 
				grouptype : 'size', 
				colorscheme : 'category', 
				minnum : 0, 
			}
		}
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_options_altered",options);	
	}
}



D3BaseTree.prototype.addMetadata=function(metadata){
	var metadata_map = {};
	Object.values(this.metadata).forEach(function(d) {
		metadata_map[d.ID] = d;
	});
	for (var id in metadata){
		var m2 = metadata[id];
		var item = metadata_map[id] ? metadata_map[id] : this.metadata[id];
		var node_id = metadata[id]['ID'];
		
		if (!item){
			if (! node_id){
				m2['ID']=node_id=id;
			}
			//the  node my change if collapsed
			m2["__Node"]=node_id;
			if (! this.metadata_map[node_id]) {
				this.metadata_map[node_id] = [id];
			} else {
				this.metadata_map[node_id].push(id);
			}
			this.metadata[id]=m2;
		} else {
			for (var key in m2){
				item[key]=m2[key];
			}		
		}
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_altered",this);	
	}
};

/**
* Returns all the metadata options as key:value(label) dictionary
* @returns {object} a key to label of metadata categories
* e.g. {collection_data:"Collection date","strain_name":"Name",....}
*/
D3BaseTree.prototype.getMetadataOptions=function(){
	
	return this.metadata_info;
}



/**
* Gets the 
*/

D3BaseTree.prototype.getSVG=function(){
	//attach legend to svg
	//this.legend_div.show();
	var mst_svg = document.getElementById("mst-svg");
	var leg, sb;
	if (getComputedStyle(gtiz_tree.tree.legend_div).display === 'block') {
		var ori_pos = { left: gtiz_tree.tree.legend_div.offsetLeft, top: gtiz_tree.tree.legend_div.offsetTop };
		leg = document.querySelector("g.legend"); // added g to .legend selector because it is causing conflicts with .legend layout div
		mst_svg.appendChild(leg);
		leg.setAttribute("transform","translate("+ori_pos.left+","+ori_pos.top+")");
	}
	if (getComputedStyle(gtiz_tree.tree.scale_div).display === 'block') {
		var ori_pos = { left: gtiz_tree.tree.scale_div.offsetLeft, top: gtiz_tree.tree.scale_div.offsetTop };
		sb = document.querySelector(".scale-bar");
		mst_svg.appendChild(sb);
		sb.setAttribute("transform","translate("+ori_pos.left+","+ori_pos.top+")");
	}

	var svgData = mst_svg.outerHTML;
	var svgData = ['<svg xmlns="http://www.w3.org/2000/svg" ', svgData.substring(5,9999999)].join('');
	if (getComputedStyle(gtiz_tree.tree.legend_div).display === 'block') {
		leg.setAttribute("transform","translate(0,0)");
		document.getElementById("legend-svg").appendChild(leg);
	}
	if (getComputedStyle(gtiz_tree.tree.scale_div).display === 'block') {
		sb.setAttribute("transform","translate(0,0)");
		document.getElementById("scale-svg").appendChild(sb);
	}

	return svgData;
};

/**
 * Canvas migration: export the tree as a PNG rendered from the canvas layer
 * (the node/link SVG that getSVG used to serialise no longer exists). The
 * current view is rasterised at `width` px (what is visible in the tree pane)
 * and the legend is added in a panel BESIDE the tree, so it is always fully
 * included regardless of the current zoom/pan. The scale bar, when shown, stays
 * composited on top of the tree at its on-screen position. The resulting image
 * is downloaded with the given filename.
 *
 * @param {number} width Output width in pixels
 * @param {string} filename Download file name (e.g. "spread123.png")
 */
D3BaseTree.prototype.exportImage = function(width, filename){
	var canvas = this.renderer.exportToCanvas(width);
	var s = canvas.width / this.width;
	// Scale bar (if visible) stays overlaid on the tree where it appears on screen.
	var scaleOverlay = null;
	if (getComputedStyle(this.scale_div).display === 'block'){
		var ssvg = document.getElementById('scale-svg');
		if (ssvg){
			scaleOverlay = { svg: ssvg, x: this.scale_div.offsetLeft * s, y: this.scale_div.offsetTop * s, s: s };
		}
	}
	// Legend (if visible) goes into a side panel to the right of the tree.
	var legendSvg = null;
	if (getComputedStyle(this.legend_div).display === 'block'){
		legendSvg = document.getElementById('legend-svg');
	}
	gtiz_file_handler.saveTreeWithLegend(canvas, scaleOverlay, legendSvg, s, filename);
};

/**
 * Export the WHOLE tree as a vector SVG (not just the visible viewport like the
 * PNG). The tree is rebuilt as SVG from the model in data coordinates; the
 * legend is placed in a panel to the right and the scale bar at the bottom-left,
 * both recomputed for the full (unzoomed) tree so the scale bar length stays
 * correct. The file is then downloaded.
 *
 * @param {string} filename Download file name (e.g. "spread123.svg")
 */
D3BaseTree.prototype.exportSvg = function(filename){
	var res = this.renderer.exportToSvg();
	var minX = res.minX, minY = res.minY, maxX = res.maxX, maxY = res.maxY;
	var treeW = maxX - minX, treeH = maxY - minY;

	function num(n){ var r = Math.round(n * 100) / 100; return r === 0 ? 0 : r; }

	// Overlays (legend, scale bar) are scaled up for big trees so they stay
	// readable relative to the tree, never smaller than their native size.
	var overlayScale = Math.max(1, Math.min(treeH / 600, 12));
	var gap = Math.max(20, treeW * 0.04);

	// ---- legend panel (to the right of the tree) ----
	// The legend is rendered at half the overlay scale (it was oversized otherwise).
	var legendScale = overlayScale / 2;
	var legendG = '', legendW = 0, legendH = 0;
	if (getComputedStyle(this.legend_div).display === 'block'){
		var legEl = document.getElementById('legend-svg');
		if (legEl){
			var lbb;
			try { lbb = legEl.getBBox(); } catch (e) { lbb = null; }
			var lNativeW = lbb ? (lbb.x + lbb.width) : (parseFloat(legEl.getAttribute('width')) || 240);
			var lNativeH = lbb ? (lbb.y + lbb.height) : (parseFloat(legEl.getAttribute('height')) || 0);
			legendW = lNativeW * legendScale;
			legendH = lNativeH * legendScale;
			var legX = maxX + gap;
			legendG = '<g class="legend-panel" transform="translate(' + num(legX) + ',' + num(minY) +
				') scale(' + num(legendScale) + ')">' + legEl.innerHTML + '</g>';
		}
	}

	// ---- scale bar (bottom-left), recomputed for the unzoomed tree ----
	var scaleG = '';
	if (getComputedStyle(this.scale_div).display === 'block'){
		var saved_scale = this.scale;
		this.scale = 1; // compute the bar in data units (k = 1, full tree)
		var dim = this._updateScaleDivSize(Math.max(40, treeW * 0.12));
		this.scale = saved_scale;
		if (dim && isFinite(dim.scaleLength) && dim.scaleLength > 0){
			var margin = Math.max(20, treeW * 0.02);
			var sx = minX + margin;
			var sy = maxY - margin;
			var tick = 4 * overlayScale;
			var sw = Math.max(1, overlayScale);
			var fontFam = (gtiz_utils.getAllCssVariables()['--font-family'] || 'sans-serif');
			scaleG = '<g class="scale-bar-export">' +
			'<text x="' + num(sx + dim.scaleLength / 2) + '" y="' + num(sy - 8 * overlayScale) +
				'" font-family="' + fontFam + '" font-size="' + num(13 * overlayScale) +
				'" text-anchor="middle" fill="black">' + dim.scaleValue + '</text>' +
			'<line x1="' + num(sx) + '" y1="' + num(sy) + '" x2="' + num(sx + dim.scaleLength) + '" y2="' + num(sy) +
				'" stroke="black" stroke-width="' + num(sw) + '"/>' +
			'<line x1="' + num(sx) + '" y1="' + num(sy - tick) + '" x2="' + num(sx) + '" y2="' + num(sy) +
				'" stroke="black" stroke-width="' + num(sw) + '"/>' +
			'<line x1="' + num(sx + dim.scaleLength) + '" y1="' + num(sy - tick) + '" x2="' + num(sx + dim.scaleLength) + '" y2="' + num(sy) +
				'" stroke="black" stroke-width="' + num(sw) + '"/>' +
			'</g>';
		}
	}

	var totalW = treeW + (legendG ? gap + legendW : 0);
	var totalH = Math.max(treeH, legendH);

	var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
		'width="' + num(totalW) + '" height="' + num(totalH) + '" ' +
		'viewBox="' + num(minX) + ' ' + num(minY) + ' ' + num(totalW) + ' ' + num(totalH) + '">' +
		'<rect x="' + num(minX) + '" y="' + num(minY) + '" width="' + num(totalW) + '" height="' + num(totalH) + '" fill="white"/>' +
		res.content + scaleG + legendG +
		'</svg>';

	gtiz_file_handler.saveSvg(svg, filename);
};

/** Adds a listener to the tree which is called when the tree is altered in some way
* @param {function} callback A callback which is called when the tree is altered
* The function should accept a string which specifies what type of change and
* data which describes the change
* <ul>
* <li> metadata_altered </li>
* <li> nodes_collapsed </li>
* <li> metadata_options_altered - data contains the new metadata options </li>
*/
D3BaseTree.prototype.addTreeChangedListener=function (callback){
	this.treeChangedListeners.push(callback);
}


/** Adds a listener to the tree which is called when nodes are selected/deselected
* @param {function} callback A function which is called when nodes are
* selected, the tree is passed  to the callback
*
*/
D3BaseTree.prototype.addNodesSelectedListener=function (callback){
	this.nodesSelectedListeners.push(callback);
}


/** Adds a listener to the tree which is called when certain display_functions
* are called - 
* @param {function} callback A function which is called when 
*  the display is altered. The function should accept the type and data
* associated with the change
* <ul>
* <li> show_hypothetical_nodes  - boolean whether the nodes are shown</li>
* <li> category_changed - string the new category
* </ul>
*
*/
D3BaseTree.prototype.addDisplayChangedListener=function (callback){
	this.displayChangedListeners.push(callback);
}

D3BaseTree.prototype.keyPressed= function(e){};
D3BaseTree.prototype.brushStarted = function(){};
D3BaseTree.prototype.brushing= function(extent){};
D3BaseTree.prototype.brushEnded= function(extent){};
D3BaseTree.prototype.legendItemCircleClicked= function(obj){};
D3BaseTree.prototype.legendItemClicked= function(obj){};

/**
 * 
 * Additional code
 * 
 */

/**
* Retreives category colors
* @returns {object} An object containing id to a list of key value pairs see {@link D3BaseTree#addMetadata}

*/
D3BaseTree.prototype.setCategoryColors = function(cat, col) {
	if (col.length == 0) {
		return;
	} // protect function if col is undefined, it could happen when categories are not defined
	var obj = {};
	var h = {};
	for (var i = 0; i < col.length; i++) {
		var k = col[i][0];
		var v = col[i][2];
		h[k] = v;
	}
	obj[cat] = h;
	this.objColors = obj;
};
