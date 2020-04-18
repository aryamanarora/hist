var width = window.innerWidth, height = window.innerHeight

var svg = d3.select("#map")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 " + width + " " + height)
    .style("background", "#eee")
var g = svg.append("g")
    .style("background", "white")

var projection = d3.geoEqualEarth()
    .scale(300)
    .translate([width / 2, height / 2])

var path = d3.geoPath()
    .projection(projection)

var scale = 1
function zoomed() {
    g.attr("transform", d3.event.transform)
    scale = d3.event.transform.k
    d3.selectAll(".city")
        .attr("r", 2.5 / d3.event.transform.k)
}
function unzoomed() {
    svg.transition().duration(1000).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    )
}
var zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 12])
    .on("zoom", zoomed)
svg.call(zoom)
svg.on("click", unzoomed)

var stringToColour = function(str) {
    var hash = 0
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    var colour = '#'
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF
        colour += ('00' + value.toString(16)).substr(-2)
    }
    return colour
}

var c = 0

var today = moment()
var date_indicator = d3.select(".date")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("opacity", 0.5)

date_indicator.on("mouseover", function (d) {
        date_indicator
            .transition()
            .duration(100)
            .style("opacity", 1)
    })
    .on("mouseout", function (d) {
        date_indicator
            .transition()
            .duration(100)
            .style("opacity", 0.5)
    })
    .append("p")
        .style("margin", "10px")
        .attr("id", "current-date")
        .text(today.format("dddd, MMMM Do, YYYY"))

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var c = null
function load(world, hist, cities, countries) {
    var year_change = date_indicator.append("div")
        .attr("class", "btn-group")
        .attr("role", "group")
        .style("margin", "0px 10px 10px 10px")
    year_change.append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary")
        .text("◀◀")
        .on("click", function(d) {
            update(today.subtract(10, "years"))
        })
    year_change.append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary")
        .text("◀")
        .on("click", function(d) {
            update(today.subtract(1, "years"))
        })
    year_change.append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary")
        .text("►")
        .on("click", function(d) {
            update(today.add(1, "years"))
        })
    year_change.append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary")
        .text("►►")
        .on("click", function(d) {
            update(today.add(10, "years"))
        })
    // console.log(cities)
    // console.log(countries)
    topo = topojson.feature(world, world.objects.land).features

    var defs = svg.append("defs")
    defs.selectAll("path")
        .data(topo)
        .enter()
        .append("path")
            .attr("id", "land")
            .attr("d", path)
            .attr("fill", "#FFF")

    var mask = defs.append("mask")
        .attr("id", "clip")
        
    mask.append("use")
        .attr("xlink:href", "#land")
    
    function update(date) {
        today = moment.utc(date)
        d3.select("#current-date")
            .text(today.format("dddd, MMMM Do, YYYY"))
        g.selectAll("*").remove()
        var cities_cur = []
        hist.forEach(city => {
            var country = null
            for (var country_date in city.data) {
                var parsed_date = moment.utc(country_date)
                if (parsed_date <= date) {
                    country = city.data[country_date]
                    break
                }
            }
            if (!country) return
            console.log(cities[city.id])
            cities_cur.push([
                cities[city.id].lon,
                cities[city.id].lat,
                city.id,
                cities[city.id].name,
                countries[country].name
            ])
        });

        var voronoi = d3.geoVoronoi()(cities_cur)

        var shapes = g.append("g")
            .attr("mask", "url(#clip)")
            .selectAll("path")
            .data(voronoi.polygons().features)
            .enter()
                .append("path")
                .attr("d", path)
                .attr("id", d => d ? "id" + d.properties.site[2] : null)
                .attr("fill", d => d ? stringToColour(d.properties.site[4]) : null)
                .attr("stroke-width", 1)
                .attr("stroke", d => d ? stringToColour(d.properties.site[4]) : null)
                .on("mouseover", function(d) {
                    if (d) {
                        d3.selectAll("#id" + d.properties.site[2])
                            .style("opacity", 0.5)
                        tooltip.style("opacity", 1)
                            .html(d.properties.site[3] + "<br><strong>" + d.properties.site[4] + "</strong>")
                            .style("left", (d3.event.pageX + 15) + "px")
                            .style("top", (d3.event.pageY - 28) + "px")
                    }
                })
                .on("mousemove", function (d) {
                    tooltip
                        .style("left", (d3.event.pageX + 15) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                })
                .on("mouseout", function(d) {
                    if (d) {
                        d3.selectAll("#id" + d.properties.site[2])
                            .transition()
                            .duration(250)
                            .style("opacity", 1)
                        tooltip.style("opacity", 0)
                    }
                })


        
        var points = g.selectAll("point")
            .data(cities_cur)
            .enter()
            .append("circle")
                .attr("class", "city")
                .attr("r", 2.5 / scale)
                .attr("cx", function(d) {return projection([d[0], d[1]])[0]})
                .attr("cy", function(d) {return projection([d[0], d[1]])[1]})
                .attr("id", d => "id" + d[2])
                .style("fill", "red")
    }

    update(today)
}

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json"),
    d3.json("data/data.json"),
    d3.json("data/cities.json"),
    d3.json("data/countries.json"),
]).then(function (files) {
    load(files[0], files[1], files[2], files[3])
})