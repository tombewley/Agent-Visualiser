function load_samples(){ 
    f = document.getElementById("samples_fname").value
    status_readout.textContent = `Loading ${f}...`
    d3.csv(`data/${f}.csv`).then((d) => {
        samples = d
        for (var i = 0; i < samples.length; i++) {samples[i].__key = i} // Add __key column for object constancy
        var_names = Object.keys(samples[0]).slice(0, -1) // Don't include __key in list of var_names
        lims = {}
        var_names.forEach(function (var_name){
            lims[var_name] = d3.extent(samples, function(d) {return +d[var_name]}) 
          })
        // Defaults
        random_subsample_size = 5000 // Number(samples_filtered.length)
        document.getElementById("random_subsample").value = random_subsample_size
        document.getElementById("x_var_input").value = var_names[0]
        document.getElementById("y_var_input").value = var_names[1]
        document.getElementById("c_var_input").value = var_names[2]
        status_readout.textContent += ` (${samples.length}, ${var_names.length}) dataset loaded.`  
        total_size_readout.textContent = samples.length
        make_pc_plot()
        bb_or_zoom_to_lims(lims)
    })
}

function load_model(){
    f = document.getElementById("model_fname").value
    status_readout.textContent = `Loading ${f}...`
    d3.json(`data/${f}.json`).then((d) => {
        if (JSON.stringify(var_names) != JSON.stringify(d.var_names)){alert("var_names do not match!"); return}
        nodes = []  
        for (var i = 0; i < d.nodes.length; i++) {
            node = d.nodes[i]
            node.__key = i; // Add __key column for object constancy
            (["bb_max", "bb_min", "mean"]).forEach(function (attr){ 
                // Convert from Array to Object, using var_names as keys
                kv = [var_names, node[attr]]
                node[attr] = Object.fromEntries(kv[0].map((col, i) => kv.map(row => row[i])))
            })
            nodes.push(node)
        } 
        nodes_filtered = nodes.filter(function (x){return x_in_l(x.bb_min, lims_filtered, true)})
        status_readout.textContent += ` ${nodes.length}-node model loaded.`;  
    })
}

function make_pc_plot(){
    var spacing = 30
    var t = svg_pc.transition().duration(animation_duration)
    var handle_size = 4.5

    svg_pc.selectAll("*").remove() // Remove all existing content
    svg_pc.selectAll(".var_label").data(var_names).enter()
        .append("text") 
        .attr("class", "var_label")    
        .attr("id", function(d){return `var_label_${d}`}) 
        .attr("fill", "white")
        .attr("dx", "-0.75em")
        .attr("dy", "0.55em")
        .attr("y", function(d, i){return i * spacing})
        .text(function(d){return d});
    label_bbox = svg_pc.node().getBBox();
    svg_pc.attr("height", label_bbox.height+8); svg_pc_outer.attr("height", label_bbox.height+8); // Resize parent to content
    
    // Create horizontal axes for handles - purely decorative
    pc_handle_range = [label_bbox.width+3, pc_width+3];
    svg_pc.selectAll(".pc_axis").data(var_names).enter()
        .append("line")
        .attr("class", "pc_axis")
        .style("stroke", "white").style("stroke-width", 0.5).style("stroke-dasharray", ("1, 3"))
        .attr("y1", function(d, i){return 3+(i * spacing)}).attr("y2", function(d, i){return 3+(i * spacing)})
        .attr("x1", pc_handle_range[0]).attr("x2", pc_handle_range[0])
        .transition(t).attr("x2", pc_handle_range[1]);

    for (const [idx, min_or_max] of ["min", "max"].entries()){ // Min and max lim handles

        // Define scales
        for (var i = 0; i < var_names.length; i++) {
            pc_scales.push(d3.scaleLinear()
                .domain(lims[var_names[i]])
                .range(pc_handle_range)
            )   
        }
        
        // Create path connecting handles
        for (var i = 0; i < var_names.length; i++) {pc_handle_pos[idx].push([pc_handle_range[idx], 3+(i * spacing)])}
        svg_pc.append("path")
            .attr("class", "handle_path")
            .attr("id", function(d){return `handle_path_${min_or_max}`})
            .attr("d", d3.line()(pc_handle_pos[idx]))
            .attr("stroke", "white").attr("fill", "none")
        pc_handle_path[idx] = d3.select(`#handle_path_${min_or_max}`)

        // Create handles themselves
        var dragging_handle = false
        svg_pc.selectAll(`.pc_handle_${min_or_max}`).data(var_names).enter()
            .append("circle")
            .attr("class", `pc_handle_${min_or_max}`)
            .attr("id", function(d){return `pc_handle_${min_or_max}_${d}`})
            .attr("data-var-num", function(d, i){return i})
            .attr("data-min-or-max", idx)
            .attr("cx", pc_handle_range[idx])
            .attr("cy", function(d, i){return 3+(i * spacing)})
            .attr("r", handle_size)
            .attr("fill", "white")
            .call(d3.drag()
                .on("start", function (event) {dragging_handle = true}) 
                .on("drag", function (event) {
                    this_d3 = d3.select(this)
                    this_idx = this_d3.attr("data-min-or-max")
                    this_var_num = this_d3.attr("data-var-num")
                    if (this_idx == 0) {x_constrained = Math.min(Math.max(event.x, pc_handle_range[0]), pc_handle_pos[1][this_var_num][0])} // Constrain motion within limits
                    else               {x_constrained = Math.min(Math.max(event.x, pc_handle_pos[0][this_var_num][0]), pc_handle_range[1])}
                    this_d3.attr("cx", x_constrained) 
                    pc_handle_pos[this_idx][this_var_num][0] = x_constrained
                    pc_handle_path[this_idx].attr("d", d3.line()(pc_handle_pos[this_idx])) 
                    lim_new = pc_scales[this_var_num].invert(x_constrained)
                    // Keep tooltip updated
                    tooltip
                        .html(Number(lim_new.toPrecision(3)))
                        .style("left", (event.sourceEvent.pageX - 30) + "px")
                })
                .on("end", function (event) {
                    dragging_handle = false
                    this_d3 = d3.select(this)
                    this_idx = this_d3.attr("data-min-or-max")
                    this_var_num = this_d3.attr("data-var-num")
                    lim_new = pc_scales[this_var_num].invert(pc_handle_pos[this_idx][this_var_num][0])
                    // Update actual lims on variable
                    lims_filtered[var_names[this_var_num]][this_idx] = lim_new
                    // Filter dataset
                    samples_filtered = samples.filter(function (x){return x_in_l(x, lims_filtered, false)})
                    if (nodes != null) {nodes_filtered = nodes.filter(function (x){return x_in_l(x.bb_min, lims_filtered, true)})}
                    filtered_size_readout.textContent = samples_filtered.length
                    samples_filtered_subsampled = random_subsample(samples_filtered, random_subsample_size)
                    // Hide tooltip
                    tooltip.transition().style("opacity", 0);
                })
            )
            .on("click", function(event) {
                if (event.defaultPrevented) return; // Triggers if dragged
            }) 
            .on("dblclick", function(event) {
                this_d3 = d3.select(this)                
                this_idx = this_d3.attr("data-min-or-max")
                this_var_num = this_d3.attr("data-var-num")
                this_var_name = var_names[this_var_num]
                // Handle case where both handles are stuck at the max end and can't access the min one
                if (this_idx == 1 && pc_handle_pos[0][this_var_num][0] == pc_handle_range[1]) {
                    d3.select(`#pc_handle_min_${this_var_name}`).dispatch("dblclick")
                }
                else {
                    pc_handle_pos[this_idx][this_var_num][0] = pc_handle_range[this_idx]
                    this_d3.transition().attr("cx", pc_handle_range[this_idx])
                    pc_handle_path[this_idx].transition().attr("d", d3.line()(pc_handle_pos[this_idx]))
                    // Reset actual lims on variable
                    lims_filtered[this_var_name][this_idx] = lims[this_var_name][this_idx]
                    // Filter dataset
                    samples_filtered = samples.filter(function (x){return x_in_l(x, lims_filtered, false)})
                    if (nodes != null) {nodes_filtered = nodes.filter(function (x){return x_in_l(x.bb_min, lims_filtered, true)})}
                    filtered_size_readout.textContent = samples_filtered.length
                    samples_filtered_subsampled = random_subsample(samples_filtered, random_subsample_size);
                }
            })        
            .on("mouseover",function(event){
                if (dragging_handle == false) {
                    this_d3 = d3.select(this)       
                    tooltip.transition().style("opacity", 1)
                    show_tooltip(Number(lims_filtered[var_names[this_d3.attr("data-var-num")]][this_d3.attr("data-min-or-max")].toPrecision(3)))
                }
            })
            .on("mouseout",function(){
                if (dragging_handle == false) {tooltip.transition().style("opacity", 0)};
            })  
    }
}  

function show_tooltip(html){
    tooltip.transition().style("opacity", 1)
    tooltip
        .html(html)
        .style("left", (event.pageX - 30) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function bb_or_zoom_to_lims(bb){  
    if (bb !== null) { 
        // If bb provided, modify lims along all variables
        lims_filtered = JSON.parse(JSON.stringify(bb))
        var_names.forEach(function(var_name){lims_to_handles(var_name)}) 
        if (bb == lims){
            samples_filtered = samples.slice() // Entire dataset
            if (nodes != null) {nodes_filtered = nodes.slice()}
        } 
        else {
            samples_filtered = samples.filter(function (x){return x_in_l(x, lims_filtered, false)})
            if (nodes != null) {nodes_filtered = nodes.filter(function (x){return x_in_l(x.bb_min, lims_filtered, true)})}
        }
    } 
    else {
        // If brush/zoom, only adopt lims in x_var and y_var
        if (brush_selection !== null) {apply_brush()} // Catch the case where the brush is still active
        lims_filtered[x_var] = x_lims; lims_filtered[y_var] = y_lims;
        [x_var, y_var].forEach(function(var_name){lims_to_handles(var_name)}) 
        // Only need to filter the current subset, because zooming can only ever reduce.
        samples_filtered = samples_filtered.filter(function (x){return x_in_l(x, lims_filtered, false)})
        if (nodes != null) {nodes_filtered = nodes_filtered.filter(function (x){return x_in_l(x.bb_min, lims_filtered, true)})}
    }    
    filtered_size_readout.textContent = samples_filtered.length
    samples_filtered_subsampled = random_subsample(samples_filtered, random_subsample_size)
}

function lims_to_handles(var_name) {
    if (var_name == "") {return}
    for (const [idx, min_or_max] of ["min", "max"].entries()){
        handle = d3.select(`#pc_handle_${min_or_max}_${var_name}`)
        var_num = handle.attr("data-var-num")
        pc_handle_pos[idx][var_num][0] = pc_scales[var_num](lims_filtered[var_name][idx])
        handle.transition().attr("cx", pc_handle_pos[idx][var_num][0])
        pc_handle_path[idx].transition().attr("d", d3.line()(pc_handle_pos[idx]))
    }
}

function apply_brush(){
    x_lims = [brush_selection[0][0], brush_selection[1][0]].map(x.invert, x)
    y_lims = [brush_selection[1][1], brush_selection[0][1]].map(y.invert, y)
    brush_area.call(brush.move, null)
}

function subsample_size_from_input(){
    inp = d3.select("#"+this.id)  
    if (this.value != inp.attr("data-prev-val")){ // Check if edit made
        if (this.value == ""){ // If left empty, reset to global
            random_subsample_size = Number(samples_filtered.length)
            this.value = random_subsample_size
        }
        else { // Otherwise, use the value given
            random_subsample_size = Number(this.value)
        }
        // Apply subsampling if needed
        samples_filtered_subsampled = random_subsample(samples_filtered, random_subsample_size)
    }
}

function random_subsample(arr, size) {
    // https://stackoverflow.com/a/11935263
    var i = arr.length
    if (i > size) {
        var shuffled = arr.slice(0), min = i - Math.min(i, size), temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }
    else {return arr.slice()}
}

function x_in_l(x, l, x_is_array){
    for (var i = 0; i < var_names.length; i++) {
        v = var_names[i]
        if (x_is_array) {if (x[v][1] < l[v][0] || x[v][0] > l[v][1]) {return false}}
        else if (x[v] < l[v][0] || x[v] > l[v][1]) {return false}
      }
    return true
} 

function update_x_y_c(){
    x_var = document.getElementById("x_var_input").value
    y_var = document.getElementById("y_var_input").value
    c_var = document.getElementById("c_var_input").value
    // Highlight variables in pc plot
    svg_pc.selectAll(".var_label").style("fill", "white")
    svg_pc.selectAll(".pc_handle_min").style("fill", "white")
    svg_pc.selectAll(".pc_handle_max").style("fill", "white")
    svg_pc.select("#var_label_"+x_var).style("fill", x_var_colour)
    svg_pc.select("#pc_handle_min_"+x_var).style("fill", x_var_colour)
    svg_pc.select("#pc_handle_max_"+x_var).style("fill", x_var_colour)
    svg_pc.select("#var_label_"+y_var).style("fill", y_var_colour)
    svg_pc.select("#pc_handle_min_"+y_var).style("fill", y_var_colour)
    svg_pc.select("#pc_handle_max_"+y_var).style("fill", y_var_colour)
    svg_pc.select("#var_label_"+c_var).style("fill", c_var_colour)
    svg_pc.select("#pc_handle_min_"+c_var).style("fill", c_var_colour)
    svg_pc.select("#pc_handle_max_"+c_var).style("fill", c_var_colour)
}

function plot(){
    update_x_y_c() 
    // Recompute lims and redraw axes
    if (brush_area != null && brush_selection != null) {apply_brush()} // If brush selection is active, use that for the lims
    else {
        // Otherwise use the extent of the current subset
        x_lims = lims_filtered[x_var].slice()
        if (y_var != "") {y_lims = lims_filtered[y_var].slice()} // Allow y_var to be empty
    } 
    x.domain(x_lims)
    if (y_var != "") {y.domain(y_lims)}
    else {y.domain([])} 
    if (c_var == "") { // Allow c_var to be empty
        c.domain([]); cbar.domain([])
        function sample_colour(){return "white"}
        function node_colour(){return "none"}
    }
    else {
        c.domain(lims_filtered[c_var])
        cbar.domain(lims_filtered[c_var])
        function sample_colour(v){return cmap(v)} // https://github.com/d3/d3-scale-chromatic
        node_colour = sample_colour
    }
    var t = svg.transition().duration(animation_duration)
    svg.select(".x_axis").transition(t).attr("opacity", "1").call(d3.axisBottom(x))
    svg.select(".x_label").text(x_var)
    svg.select(".y_axis")
        .transition(t).attr("opacity", () => {if (y_var != "") {return "1"} else {return "0"}})
        .call(d3.axisLeft(y)) 
    svg.select(".y_label").text(y_var) 
    svg.select(".cbar")
        .transition(t).attr("opacity", () => {if (c_var != "") {return "1"} else {return "0"}})
        .call(d3.axisLeft(cbar)).select('.domain').attr('stroke-width', 0)
    
    // Show node projections as rectangles
    if (nodes != null) {
        rects = node_canvas.selectAll(".node").data(nodes_filtered, function(d) {return d.__key})  
        if (document.getElementById("show_nodes").checked == false) {rects.transition(t).style("opacity", 0).remove()}
        else {
            w.domain([0, x_lims[1]-x_lims[0]]); h.domain([0, y_lims[1]-y_lims[0]])
            rects.transition(t) // This is executed for each existing element in order
                .attr("x", function(d){return x(d.bb_min[x_var][0])})
                .attr("y", function(d){
                    if (y_var != "") {return y(d.bb_min[y_var][1])} else {return 0}})
                .attr("width", function(d){return w(d.bb_min[x_var][1] - d.bb_min[x_var][0])}) 
                .attr("height", function(d){
                    if (y_var != "") {return h(d.bb_min[y_var][1] - d.bb_min[y_var][0])}
                    else {return height}
                })
                .attr("fill", function(d){return node_colour(c(d.mean[c_var]))});
            rects.enter() // This is triggered when there are more data instances than HTML elements
                .append("rect")
                .attr("class", "node")
                .attr("x", function(d){return x(d.bb_min[x_var][0])})
                .attr("y", function(d){
                    if (y_var != "") {return y(d.bb_min[y_var][1])} else {return 0}})
                .attr("width", function(d){return w(d.bb_min[x_var][1] - d.bb_min[x_var][0])}) 
                .attr("height", function(d){
                    if (y_var != "") {return h(d.bb_min[y_var][1] - d.bb_min[y_var][0])}
                    else {return height}
                })
                .attr("fill", function(d){return node_colour(c(d.mean[c_var]))})
                .attr("stroke", "white")
                .on("click", function(event, d) {
                    show_tooltip(`Node ${d.__key}<br>${d.num_samples} samples`)
                })
                .on("dblclick", function(event, d){bb_or_zoom_to_lims(d.bb_min); plot()}) // Click to adopt lims
                .attr("opacity", 0)
                .transition(t)
                .style("opacity", 1);
            rects.exit() // This is triggered when there are more HTML elements than data instances
                .transition(t).style("opacity", 0)
                .remove();
        }
    }
    // Show samples as scatter points - NOTE: creating these as rectangles allows them to be morphed in shape
    status_readout.textContent = `Showing ${samples_filtered_subsampled.length} samples in (${x_var}, ${y_var}).`
    rad = size_slider.value() // Radius from slider
    diam = 2 * rad
    points = sample_canvas.selectAll(".sample").data(samples_filtered_subsampled, function(d) {return d.__key})
    points.transition(t)
        .attr("x", function(d){return x(d[x_var]) - rad})
        .attr("y", function(d){
            if (y_var != "") {return y(d[y_var]) - rad}
            else {return 0}
        })
        .attr("width", diam)
        .attr("height", function(){
            if (y_var != "") {return diam}
            else {return height}
        })
        .attr("rx", rad).attr("ry", rad)
        .attr("fill", function(d){return sample_colour(c(d[c_var]))});
    points.enter()
        .append("rect")
        .attr("class", "sample")
        .attr("x", function(d){return x(d[x_var]) - rad})
        .attr("y", function(d){if (y_var != "") {return y(d[y_var]) - rad}})
        .attr("width", diam)
        .attr("height", function(){
            if (y_var != "") {return diam}
            else {return height}
        })
        .attr("rx", rad).attr("ry", rad)
        .attr("fill", function(d){return sample_colour(c(d[c_var]))})
        .attr("opacity", 0)
        .transition(t)
        .style("opacity", 1);    
    points.exit()
        .transition(t).style("opacity", 0)
        .remove();
}    

function run_python(){
    // Get filename and print in status_readout.
    var f = document.getElementById("samples_fname").value
    // status_readout.textContent = `Running Python on ${f}...`
    fetch("/python_child_process", { // Run Python script on server-side.
        method: "POST",
        // method: "GET",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({filename: f})
    })
    .then((response) => { // Wait for a response JSON from Python
        response.json().then((data) => {
        })
    })
}