function populate_graph(graph, fname) {
	d3.json(`${fname}.json`).then((d) => {
		set_fixed_positions(d)
		graph
			// .resetProps() // Wipe current state
			.graphData(d)
			.warmupTicks(0) // Number of unrendered steps before positions freeze
			.cooldownTicks(200) // Number of rendered steps before positions freeze
			// .onEngineStop(() => graph.zoomToFit(400))
			// .onEngineStop(() => fix_node(graph))
			.nodeRelSize(0)
			.nodeLabel("id")
			.linkLabel("value")
			.nodeAutoColorBy("group")
			// .nodeThreeObject(node => {
			// 	const sprite = new SpriteText(node.id);
			// 	sprite.color = node.color;
			// 	sprite.textHeight = 12;
			// 	return sprite;
			//   })
			.forceEngine("d3-force-3d") // Either d3-force-3d or ngraph
			.nodeOpacity(1)
			.linkOpacity(1)
			.linkWidth("1px")
			// .linkDirectionalArrowLength(5)
			// .linkDirectionalArrowRelPos(1)
			// .linkDirectionalParticles(2)
			// .linkCurvature(0.25);
	})
};

function set_fixed_positions(d) {
	d.nodes.forEach((node) => {
		if ("mean" in node) {
			node.fx = node.mean[2]
			node.fy = node.mean[3]
			node.fz = node.mean[4]
		}
	})
}

// =========================================================================

// From https://github.com/vasturiano/3d-force-graph
const graph = ForceGraph3D()(document.getElementById("graph_canvas"));
graph.backgroundColor("#000").showNavInfo(false);

populate_graph(graph, "data/test_graph");