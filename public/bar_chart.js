document.addEventListener("DOMContentLoaded", () => {
   // Handler when the DOM is fully loaded
    
    //load graph
    plotBarChartFromData("data/letter_freqs.json");
});

function plotBarChartFromData(fileName) {

   // set the dimensions of the canvas
    var margin = {top: 20, right: 20, bottom: 70, left: 40},
    width = window.innerWidth * 0.9 - margin.left - margin.right,
    height = window.innerHeight * 0.9 - margin.top - margin.bottom;

    // set the ranges
    var x = d3.scaleBand().rangeRound([0, width]).padding(.05);
    var y = d3.scaleLinear().range([height, 0]);

    // define the axis
    var xAxis = d3.axisBottom(x);
    var yAxis = d3.axisLeft(y).ticks(10);

    // add the SVG element
    var svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    // load the data
    d3.json(fileName).then(data => {

        data.forEach(function(d) {
            d.Letter = d.Letter;
            d.Freq = +d.Freq;
        });

        // scale the range of the data
        x.domain(data.map(function(d) { return d.Letter; }));
        y.domain([0, d3.max(data, function(d) { return d.Freq; })]);

        // add axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)" );

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 5)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Frequency");


        // Add bar chart
        svg.selectAll("bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d.Letter); })
            .attr("width", x.bandwidth())
            .attr("y", function(d) { return y(d.Freq); })
            .attr("height", function(d) { return height - y(d.Freq); });

    });

}