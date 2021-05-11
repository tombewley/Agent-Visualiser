function populate_graph(graph, fname) {
	d3.json(`${fname}.json`).then((d) => {
		set_fixed_positions(d)
		graph
			// .resetProps() // Wipe current state
			.graphData(d)
			.enableNodeDrag(true)
			.numDimensions(num_dims)
			.warmupTicks(0) // Number of unrendered steps before positions freeze
			.cooldownTicks(200) // Number of rendered steps before positions freeze
			// .onEngineStop(() => graph.zoomToFit(400))
			// .onEngineStop(() => fix_node(graph))
			.nodeRelSize(3)
			.nodeLabel("id")
			// .linkLabel("value")
			.nodeColor(d => "rgba(0, 0, 0, 1)")
			// .nodeAutoColorBy("group")
			// .nodeThreeObject(node => {
			// 	const sprite = new SpriteText(node.id);
			// 	sprite.color = node.color;
			// 	sprite.textHeight = 12;
			// 	return sprite;
			//   })
			.forceEngine("d3-force-3d") // Either d3-force-3d or ngraph
			.nodeOpacity(1)
			.linkColor(set_link_colour)
			.linkOpacity(1)
			.linkWidth(set_link_width)
			.linkDirectionalArrowLength(5)
			// .linkDirectionalArrowRelPos(s1)
			// .linkDirectionalParticles(2)
			.linkCurvature(0.25);
	})
};

function set_link_colour(d) {
	if (d.source == "A") {
		return "red"
	}
	return "rgba(0, 0, 0, 1)"
};

function set_link_width(d) {
	if (d.source.id == "A") {
		return 1.5
	}
	return 1
}

function set_fixed_positions(d) {
	d.nodes.forEach((node) => {
		if ("mean" in node) {
			node.fx = node.mean[2]
			node.fy = node.mean[3]
			node.fz = node.mean[4]
		}
		c = graph.graph2ScreenCoords(node.fx, node.fy, node.fz);

		// Add the path using this helper function
		svg.append("rect")
			.attr('x', c.x)
			.attr('y', c.y)
			.attr('width', 50)
			.attr("height", 50)
			.attr('stroke', 'black')
			.attr('fill', '#69a3b2');
	})
}

const toggle_dimensions = function(_num_dims) {
	num_dims = _num_dims;
	graph.numDimensions(num_dims);
	if (num_dims == 2) {
		p = graph.camera().position;
		graph
			.cameraPosition({x: 0, y: 0, z: (p.x**2 + p.y**2 +p.z**2)**0.5})
			.enableNavigationControls(false)
	}
	else {
		graph.enableNavigationControls(true)
	}
};

// =========================================================================

let num_dims = 3;

// From https://github.com/vasturiano/d3-force-3d and https://github.com/vasturiano/3d-force-graph
const graph = ForceGraph3D({controlType:"orbit"})(document.getElementById("graph_canvas"));
graph.backgroundColor("rgba(0, 0, 0, 0)").showNavInfo(false);
populate_graph(graph, "data/tiny_graph");

var svg = d3.select(".other_shapes").append("svg")
	.attr("width", window.innerWidth-13)
	.attr("height", window.innerHeight-20)

var arrow_heads = [
	{ id: 2, name: "arrow", path: "M 0,0 m -5,-5 L 5,0 L -5,5 Z", viewbox: "-5 -5 10 10"}
]
var defs = svg.append("svg:defs")
var marker = defs.selectAll("marker")
    .data(arrow_heads)
    .enter()
    .append('svg:marker')
      .attr('id', function(d){ return 'marker_' + d.name})
      .attr('markerHeight', 5)
      .attr('markerWidth', 5)
      .attr('markerUnits', 'strokeWidth')
      .attr('orient', 'auto')
      .attr('refX', 0)
      .attr('refY', 0)
      .attr('viewBox', function(d){ return d.viewbox })
      .append('svg:path')
        .attr('d', function(d){ return d.path })
        .attr('fill', function(d,i) { console.log(i); return "k"});

    // <marker
    //   id="arrow"
    //   markerUnits="strokeWidth"
    //   markerWidth="12"
    //   markerHeight="12"
    //   viewBox="0 0 12 12"
    //   refX="6"
    //   refY="6"
    //   orient="auto">
    //   <path d="M2,2 L10,6 L2,10 L6,6 L2,2" style="fill: #f00;"></path>


var line = svg.append("line")
	.attr("x1",50)  
	.attr("y1",10)  
	.attr("x2",200)  
	.attr("y2",50)  
	.attr("stroke","red")  
	.attr("stroke-width",2)  
	.attr("marker-end","url(#marker_arrow)");  

var curve_path = "M "+ "200 175" + "A 50 50 0 0 0" + "300 200"
var curve = svg.append("path")  
	.attr("d",curve_path)  
	.attr("fill","white")  
	.attr("stroke","blue")  
	.attr("stroke-width",2)  
	// .attr("marker-start","url(#marker_arrow)")  
	// .attr("marker-mid","url(#marker_arrow)")  
	.attr("marker-end","url(#marker_arrow)"); 

console.log(curve)