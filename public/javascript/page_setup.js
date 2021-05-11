// Display variables
var total_width = (window.innerWidth * 0.66) - 13
var total_height = window.innerHeight - 20
var margin = {top: 5, right: 50, bottom: 48, left: 70}
var width = total_width - margin.left - margin.right
var height = total_height - margin.top - margin.bottom
var x_var_colour = "hotpink"
var y_var_colour = "orange"
var c_var_colour = "cadetblue"
var cmap = d3.interpolateRdYlBu
var cbar_height = height-15, cbar_width = 10, cbar_resolution = 100, cbar_segment = cbar_height/cbar_resolution
var animation_duration = 1000

// Data variables
var var_names = null
var samples = null
var nodes = null
var lims = null
var samples_filtered = null
var nodes_filtered = null
var lims_filtered = null
var samples_filtered_subsampled = null
var x_var = null
var x_lims = null
var y_var = null
var y_lims = null
var c_var = null
var pc_handle_pos = [[],[]]
var pc_handle_path = [null, null]
var pc_scales = []
var last_clicked_var_name = null
var brush_selection = null

// Names of DOM elements
var status_readout = document.getElementById("status_readout")
var filtered_size_readout = document.getElementById("filtered_size")
var total_size_readout = document.getElementById("total_size")

// ==================================================================================
// MAIN VISUALISATION AXES

// Append the svg object to the canvas div
var svg_outer = d3.select("#canvas").append("svg").attr("width", total_width).attr("height", total_height)

// Create inner group to leave some margin - everything goes inside this
var svg = svg_outer.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")

// Create clip area to hide overflow - plotted data go inside this
var clip = svg.append("defs").append("svg:clipPath")
    .attr("id", "clip")
    .append("svg:rect")
    .attr("id", "clip-rect")
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", width)
    .attr("height", height);
var node_canvas = svg.append("g").attr("clip-path", "url(#clip)") // Nodes behind samples
var sample_canvas = svg.append("g").attr("clip-path", "url(#clip)")

// Define scales
var x = d3.scaleLinear().range([0, width])
var y = d3.scaleLinear().range([height, 0])
var w = d3.scaleLinear().range([0, width])
var h = d3.scaleLinear().range([0, height])
var c = d3.scaleLinear().range([0, 1])
var cbar = d3.scaleLinear().range([cbar_height, 0])

// Create axes
svg.append("g")
    .attr("class", "x_axis") 
    .attr("opacity", 0)
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
svg.append("text")
    .attr("class", "x_label") 
    .attr("fill", x_var_colour)
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate('+ (width/2) +','+(height+margin.bottom-3)+')') 
    .text("");
svg.append("g")
    .attr("class", "y_axis") 
    .attr("opacity", 0)
    .call(d3.axisLeft(y));
svg.append("text")
    .attr("class", "y_label") 
    .attr("fill", y_var_colour)
    .attr("transform", "rotate(-90)")
    .attr("x",-(height/2))
    .attr("y",-margin.left)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("");  

// Create colour bar
cbar_scale = d3.scaleSequential(cmap).domain([0,cbar_resolution-1])
cbar_group = svg.append("g")
    .attr("class", "cbar") 
    .attr("transform", `translate(${total_width-margin.left-cbar_width},0)`) 
    .attr("opacity", 0);
cbar_group.selectAll(".rects")
    .data([...Array(cbar_resolution).keys()].reverse())
    .enter().append("rect")
    .attr("x", 0)
    .attr("width", cbar_width)
    .attr("y", (d,i)=>i*cbar_segment)
    .attr("height", cbar_segment+1)
    .attr("fill", d=>cbar_scale(d));

// Create brush_selection tool
var brush = d3.brush()
    .extent([[0, 0],[width, height]])
    .on("end", function () {brush_selection = d3.brushSelection(this)})
var brush_area = null // Don't create by default

// Create general-purpose tooltip
var tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0)
cbar_group.on("click", function() {tooltip.transition().style("opacity", 0)}) // Click to hide

// Create xyc selector tooltip
var xyc_selector = d3.select(".xyc_selector").style("opacity", 0)
xyc_selector.on("click",function(){ // Click to hide 
    d3.select(this)
        .transition().style("opacity", 0)
        .transition().duration(0).style("left", "0px").style("top", "0px")
});  

// Create lim input tooltip
var lim_input_div = d3.select(".lim_input_div").style("opacity", 0)
var lim_input = document.getElementById("lim_input")
d3.select("#lim_input").on("blur", ()=>{
    d3.select(`#pc_handle_${["min","max"][last_clicked_var_name[1]]}_${last_clicked_var_name[0]}`)
        .dispatch("dblclick", {detail: lim_input.value}) // Pass new value into "dblclick" as argument
})

// ==================================================================================
// PARALLEL COORDINATES PLOT

// Append the svg object to the canvas div, and create isnner group to leave some margin
var svg_pc_outer = d3.select("#parallel_coords_canvas").append("svg").attr("width", "100%")
var pc_width = svg_pc_outer.node().getBoundingClientRect().width - 20
var svg_pc = svg_pc_outer.append("g").attr("transform", "translate(" + 10 + "," + 10 + ")")

// ==================================================================================
// INTERACTION

// Button functionality
d3.select("#load_samples").on("click", load_samples);
d3.select("#load_graph").on("click", load_graph);
d3.select("#plot").on("click", plot);
d3.select("#toggle_brush").on("click", function(){
    btn = d3.select("#toggle_brush")
    if (brush_area == null) {
        brush_area = svg.append("g").call(brush); 
        btn.style("background-color", "rgb(50, 50, 50)").text("Brush On")
    }
    else {
        brush_area.remove(); brush_area = null; 
        btn.style("background-color", "rgb(15, 15, 15)").text("Brush Off")
    }
});
d3.select("#apply_brush_zoom").on("click", function(){bb_or_zoom_to_lims(null); plot()});
d3.select("#random_subsample").on("focus", function(){this.setAttribute("data-prev-val", this.value)})
d3.select("#random_subsample").on("blur", subsample_size_from_input)
d3.select("#reset_lims").on("click", function(){bb_or_zoom_to_lims(lims)});
d3.select("#run_python").on("click", run_python);
d3.select('#export_image').on('click', function(){
    f = document.getElementById("export_fname").value
    format = f.split(".")[1]
    if (format != "png"){alert("Currently only works with PNG"); return}
    svg.select(".x_label").attr("fill", "black")
    svg.select(".y_label").attr("fill", "black")
	svgString2Image( getSVGString(svg_outer.node()), 2*width, 2*height, format, save )
    function save(dataBlob, filesize){saveAs(dataBlob, f)}
    svg.select(".x_label").attr("fill", x_var_colour)
    svg.select(".y_label").attr("fill", y_var_colour)
});
d3.select("#to_x").on("click", function(){document.getElementById("x_var_input").value = last_clicked_var_name; update_x_y_c()});
d3.select("#to_y").on("click", function(){document.getElementById("y_var_input").value = last_clicked_var_name; update_x_y_c()});
d3.select("#to_c").on("click", function(){document.getElementById("c_var_input").value = last_clicked_var_name; update_x_y_c()});

// Slider functionality
var size_slider = d3
    .sliderHorizontal()
    .min(0.1).max(10)
    .ticks(0)
    .tickFormat(d3.format('.2'))
    .default(2)
    .on("onchange", r => {svg.selectAll(".sample").attr("r", r)});
var s1 = d3
    .select("#scatter_size_slider")
    .append("svg")
    .append("g")
    .attr("transform", "translate(15,15)");
s1.call(size_slider);

var opacity_slider = d3
    .sliderHorizontal()
    .min(0).max(1)
    .ticks(0)
    .tickFormat(d3.format('.2'))
    .default(1)
    .on("onchange", o => {svg.selectAll(".sample").attr("opacity", o)});
var s2 = d3
    .select("#scatter_opacity_slider")
    .append("svg")
    .append("g")
    .attr("transform", "translate(15,15)");
s2.call(opacity_slider);

// Keypress shortcuts
document.addEventListener("keypress", keypress);
function keypress(event) { 
    // console.log(event.keyCode)
    switch (event.keyCode) {
        case 59: load_samples(); break; // ;
        case 39: load_graph(); break; // '
        case 13: plot(); break; // Enter
        case 91:
            x_in = document.getElementById("x_var_input"); x_var = x_in.value
            y_in = document.getElementById("y_var_input"); y_var = y_in.value
            x_in.value = y_var; y_in.value = x_var; plot(); break;
        case 93:
            x_in = document.getElementById("x_var_input"); x_var = x_in.value
            c_in = document.getElementById("c_var_input"); c_var = c_in.value
            x_in.value = c_var; c_in.value = x_var; plot(); break;
        case 92:
            y_in = document.getElementById("y_var_input"); y_var = y_in.value
            c_in = document.getElementById("c_var_input"); c_var = c_in.value
            y_in.value = c_var; c_in.value = y_var; plot(); break;
    }
}