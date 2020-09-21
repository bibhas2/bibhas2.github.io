import Interactive from "https://vectorjs.org/interactive.js";

class Transformer {
    xscale = 1.0
    yscale = 1.0
    xmin = 0
    xmax = 0
    ymin = 0
    ymax = 0

    constructor(svg){
        this.svg = svg
    }

    setup(data) {
        let [xmin, ymin] = data.reduce((last, pair) => [Math.min(last[0], pair[0]), Math.min(last[1], pair[1])])
        let [xmax, ymax] = data.reduce((last, pair) => [Math.max(last[0], pair[0]), Math.max(last[1], pair[1])])

        this.xmin = xmin
        this.xmax = xmax
        this.ymin = ymin
        this.ymax = ymax

        let [xsum, ysum] = data.reduce((last, pair) => [last[0] + pair[0], last[1] + pair[1]])
        
        let xavg = xsum / data.length
        let yavg = ysum / data.length

        this.xscale = (2 * xavg) / (this.svg.width - this.svg.originX)
        this.yscale = (2 * yavg) / this.svg.originY

        let transformedData = data.map(pair => [pair[0]/this.xscale, - (pair[1]/this.yscale)])

        return transformedData
    }

    toSVG(pair) {
        return [pair[0]/this.xscale, - (pair[1]/this.yscale)]
    }
}

let footTrafficData = [
    [30, 4],
    [40, 5],
    [45, 5],
    [50, 5.6],
    [60, 6],
    [65, 7.5],
    [70, 8.],
    [75, 8.5],
    [80, 8.75]
    // [0, 0],
    // [100, 100],
    // [200, 200]
]
let margin = 40

// Construct an interactive within the HTML element with the id "my-interactive"
let interactive = new Interactive("my-interactive", {
    width: 600,
    height: 400,
    originX: margin,
    originY: 400 - margin
});

let xform = new Transformer(interactive)
let transformedData = xform.setup(footTrafficData)
let numFormatter = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2})
let coord = xform.toSVG([0, xform.ymin])
let start = interactive.control(coord[0], coord[1])

coord = xform.toSVG([0, xform.ymax])
let end = interactive.control(interactive.width - 2 * margin, coord[1])
let line = interactive.line(start.x, start.y, end.x, end.y)

let xAxis = interactive.line(0, 0, interactive.width - margin, 0);
let yAxis = interactive.line(0, 0, 0, -interactive.height + margin);
let marker = interactive.marker(10, 5, 10, 10);
marker.path('M 0 0 L 10 5 L 0 10 z').style.fill = '#404040';
marker.setAttribute('orient', 'auto-start-reverse');
xAxis.setAttribute('marker-end', `url(#${marker.id})`);
yAxis.setAttribute('marker-end', `url(#${marker.id})`);

start.constrainToY()
end.constrainToY()

end.addDependency(start)
end.update = function() { 
    end.y = end.y + start.dy
}

line.addDependency(start)
line.addDependency(end)
line.update = function () {
    this.x1 = start.x;
    this.y1 = start.y;
    this.x2 = end.x;
    this.y2 = end.y;
}

let bValue = interactive.text( start.x + 10, start.y + 10, `b: ${numFormatter.format(start.y)}`)
bValue.addDependency(start)
bValue.update = function() {
    bValue.y += start.dy
    bValue.contents = `b: ${numFormatter.format(start.y)}`
}

let wValue = interactive.text( end.x - 80, end.y - 10, `W: ${numFormatter.format(end.y)}`)
wValue.addDependency(end)
wValue.update = function() {
    wValue.y += end.dy
    wValue.contents = `W: ${numFormatter.format(end.y)}`
}

transformedData.forEach(pair => {
    interactive.circle(pair[0], pair[1], 5)
})