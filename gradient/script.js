import Interactive from "https://vectorjs.org/interactive.js";

// Construct an interactive within the HTML element with the id "my-interactive"
let interactive = new Interactive("my-interactive");
// interactive.border = true;

let margin = 32

let start = interactive.control(margin, 70)
let end = interactive.control(300, 100)
let line = interactive.line(start.x, start.y, end.x, end.y)

let xAxis = interactive.line(margin, interactive.height - margin, interactive.width - 2 * margin, interactive.height - margin);
let yAxis = interactive.line(margin, interactive.height - margin, margin, margin);
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

let bValue = interactive.text( start.x + 10, start.y - 10, `b: ${start.y}`)
bValue.addDependency(start)
bValue.update = function() {
    bValue.y += start.dy
    bValue.contents = `b: ${start.y}`
}

let wValue = interactive.text( end.x + 10, end.y - 10, `W: ${end.y}`)
wValue.addDependency(end)
wValue.update = function() {
    wValue.y += end.dy
    wValue.contents = `W: ${end.y}`
}