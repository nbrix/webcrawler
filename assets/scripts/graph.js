// Create d3 graph
function createGraph(eventlink) {
    var link = eventlink;
    var source = new EventSource(link);

    const data = {
        nodes: [],
        links: [],
    }

    const linkedByIndex = {};

    d3.select(".canvas")
    .append("div")
    .classed("svg-container", true)
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 600 60")
    .classed("svg-content-responsive", true);

	// Add gradient background
    var radialGradient = d3.select('svg').append("defs")
        .append("radialGradient")
        .attr("id", "radial-gradient")
        .attr("cx", "70%")
        .attr("cy", "100%")
        .attr("r", "90%")
        .attr("fy", "60%");

    radialGradient.append("stop")
    .attr("offset", "5%")
    .attr("stop-color", "#EEFFFF");

    radialGradient.append("stop")
    .attr("offset", "95%")
    .attr("stop-color", "#DDEEFF");
	
    d3.select('svg').append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("pointer-events", "all")
    .style("fill", "url(#radial-gradient)");

	// Set height and width
    const svgCanvas = d3.select('svg');
    const width = Math.round(Number(svgCanvas.style('width').slice(0, -2)));
    const height = Math.round(Number(svgCanvas.style('height').slice(0, -2)));

    // Create D3 force instance --> controls all forces acting on graph
    const graphSimulation = d3.forceSimulation();

    // Create forces to act upon simulation
    const linkForce = d3.forceLink().id(d => d.url).distance(10).strength(0.5);
    const chargeForce = d3.forceManyBody().strength(-420);
    const centerForce = d3.forceCenter(width / 2, height / 2);
    const collisionForce = d3.forceCollide();

    // Append forces to simulation instance
    graphSimulation
    .force('link', linkForce)
    .force('center', centerForce)
    .force('charge', chargeForce)

    // Wrapper for all the elements within the graph
    const graphWrapper = svgCanvas.append('g');

    // Group for all links between nodes
    let linkElements = graphWrapper.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(data.links)
        .enter().append('line');

    // Group for all nodes within graph
    let nodeElements = graphWrapper.append('g')
        .selectAll('path')
        .data(data.nodes)
        .enter().append('path')

    nodeElements
    .on('click', d => window.open(d.url, '_blank'))
    .on('mouseover.info', displayInfo)
    .on('mouseover.fade', fade(.1))
    .on('mouseover.increase', increaseNodeSize)
    .on('mouseleave.fade', fade(1))
    .on('mouseleave.decrease', decreaseNodeSize)
    .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded))

    var zoom = svgCanvas.call(d3.zoom()
            .on('zoom', zoomAction));

    // Start the simulation
    graphSimulation
    .nodes(data.nodes)
    .on('tick', tickAction);

    graphSimulation
    .force('link')
    .links(data.links);

    data.links.forEach(d => {
        linkedByIndex[`${d.source.index},${d.target.index}`] = 1;
    });

    // Helper functions
    function tickAction() {
        linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
        nodeElements
        .attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')'
        });
    }

    function dragStarted(d) {
        if (!d3.event.active)
            graphSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragEnded(d) {
        if (!d3.event.active)
            graphSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    //add on doubleclick listener to release nodes
    function releaseNode(d) {
        d.fx = null;
        d.fy = null;
    }

    //Handles pan/zoom event for graph
    function zoomAction() {
        graphWrapper.attr('transform', d3.event.transform);
    }

    function displayInfo(d) {
        const infoBoxTitle = d3.select('#pageTitle');
        const infoBoxUrl = d3.select('div#url');
        infoBoxTitle.html(`<p>${d.title}</p>`);
        infoBoxUrl.html(`<a href=${d.url}>${d.url}</a>`);
    }

    function isConnected(a, b) {
        return linkedByIndex[`${a.index},${b.index}`] || linkedByIndex[`${b.index},${a.index}`] || a.index === b.index;
    }

    function fade(opacity) {
        return function (d) {
            nodeElements.style('stroke-opacity', function (o) {
                let thisOpacity = isConnected(d, o) ? 1 : opacity;
                this.setAttribute('fill-opacity', thisOpacity);
                this.setAttribute('stroke-width', '1px');
                return thisOpacity;
            });
            linkElements.style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : opacity));
        };
    }

    function increaseNodeSize(d) {
        const node = d3.select(this);

        node
        .transition()
        .attr("x", function (d) {
            return -60;
        })
        .attr("y", function (d) {
            return -60;
        })
        .attr("height", 100)
        .attr("width", 100);

    }

    function decreaseNodeSize(d) {
        const node = d3.select(this);
        node
        .transition()
        .attr("x", function (d) {
            return -25;
        })
        .attr("y", function (d) {
            return -25;
        })
        .attr("height", 50)
        .attr("width", 50);

    }

    function update() {
        linkElements = linkElements.data(data.links);
        linkElements.exit().remove();
        linkElements = linkElements.enter().append('line')
            .attr('class', 'links')
            .merge(linkElements);

        nodeElements = nodeElements.data(data.nodes);
        nodeElements.exit().remove();
        nodeElements = nodeElements.enter().append('g')
            .merge(nodeElements);

        // Add favicon
        var image = nodeElements
            .append("svg:image")
            .attr("xlink:href", function (d) {
                return d.icon
            })
            .attr("x", function (d) {
                return -10;
            })
            .attr("y", function (d) {
                return -10;
            })
            .attr("height", 20)
            .attr("width", 20);

        nodeElements
        .on('click', d => window.open(d.url, '_blank'))
        .on('mouseover.info', displayInfo)
        .on('mouseover.fade', fade(.1))
        .on('mouseover.increase', increaseNodeSize)
        .on('mouseleave.fade', fade(1))
        .on('mouseleave.decrease', decreaseNodeSize)
        .call(d3.drag()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded))

        image
        .on('mouseenter', function () {
            // select element in current context
            d3.select(this)
            .transition()
            .attr("x", function (d) {
                return -20;
            })
            .attr("y", function (d) {
                return -20;
            })
            .attr("height", 40)
            .attr("width", 40);
        })
        // set back
        .on('mouseleave', function () {
            d3.select(this)
            .transition()
            .attr("x", function (d) {
                return -10;
            })
            .attr("y", function (d) {
                return -10;
            })
            .attr("height", 20)
            .attr("width", 20);
        });

        svgCanvas.call(d3.zoom()
            .on('zoom', zoomAction));

        // Start the simulation
        graphSimulation
        .nodes(data.nodes)
        .on('tick', tickAction);

        graphSimulation
        .force('link')
        .links(data.links);

        graphSimulation.alpha(.65).restart();
    }

    var numberOfLinks = 0;
    var isDisabled = false;
    var keywordFound = false;
    var inProgress;

    // Listening to server for data
    source.addEventListener('message', function (e) {
        if (!isDisabled) {
            disableLinks();
            isDisabled = true;
            var count = 0;
            inProgress = setInterval(function () {
                    count++;
                    document.getElementById('crawlStatus').innerHTML = "<h5>Crawl in Progress" + new Array(count % 5).join('.') + "</h5>";
                }, 900);
        }

        var link = JSON.parse(e.data);
        numberOfLinks = numberOfLinks + 1;

        if (!keywordFound) {
            if (link.keyword) {
                keywordFound = true;
            }
        }

        //Temporarily hold new nodes and links between nodes
        const newNodes = [];
        const newLinks = [];

        //create node and link object that d3 understands

        newNodes.push({
            title: link.title,
            url: link.url,
            group: link.group,
            keyword: link.keyword,
            icon: (link.keyword) ? "../images/starkey.ico" : link.icon
        });
        newLinks.push({
            source: `${link.prevURL ? link.prevURL : link.url}`,
            target: link.url
        });

        //Add new data to old data
        data.nodes = [...data.nodes, ...newNodes];
        data.links = [...data.links, ...newLinks];

        //call update to add new data to the graph
        update();

        //Add new link connections to linkedByIndex object
        newLinks.forEach(link => {
            linkedByIndex[`${link.source.index},${link.target.index}`] = 1;
        });
    }, false);
    source.addEventListener('close', function (e) {
        enableLinks();
        fillInModal(numberOfLinks, keywordFound);
        $('#crawlCompleteModal').modal('show');
        document.getElementById('crawlStatus').innerHTML = "";
        clearInterval(inProgress);
        isDisabled = false;
        source.close();
    }, false);
}

// When crawler is done, allow links to be clickable
function enableLinks() {
    $('#previousUrls a').unbind('click');
    $("#submitButton").attr("disabled", false);
    $('a').css({
        'cursor': "pointer"
    });
}

// Disables links when crawler is running
function disableLinks() {
    $('#previousUrls a').bind('click', function (e) {
        e.preventDefault();
    })
    $("#submitButton").attr("disabled", true);
    $('a').css({
        'cursor': "progress"
    });
}

// Fill in info for modal when crawler is done
function fillInModal(numberOfLinks, keywordFound) {
    var maxLinks = 300;
    var linkInfo = document.getElementById("linkcount");
    var keywordInfo = document.getElementById("keywordfound");

    // Fill in link info
    linkInfo.innerHTML = "Links Found: " + numberOfLinks;
    if (numberOfLinks >= maxLinks) {
        linkInfo.innerHTML = "Maximum number of links reached: " + maxLinks;
    }

    // Fill in keyword info
    if (document.getElementById("keyword").value != "") {
        if (keywordFound) {
            keywordInfo.innerHTML = "<br> <img src='../images/starkey.ico' alt='Keyword Icon'> Keyword Found!";
        } else {
            keywordInfo.innerHTML = "<br>Keyword Not Found";
        }
    }

}
