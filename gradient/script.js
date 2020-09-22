import Interactive from "https://vectorjs.org/interactive.js";

class Transformer {
    xscale = 1.0
    yscale = 1.0
    xmin = 0
    xmax = 0
    ymin = 0
    ymax = 0

    constructor(svg) {
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

        let transformedData = data.map(pair => [pair[0] / this.xscale, - (pair[1] / this.yscale)])

        return transformedData
    }

    toSVG(pair) {
        return [pair[0] / this.xscale, - (pair[1] / this.yscale)]
    }
    fromSVG(pair) {
        return [pair[0] * this.xscale, - (pair[1] * this.yscale)]
    }
    getSlope(start, end) {
        let startData = this.fromSVG([start.x, start.y])
        let endData = this.fromSVG([end.x, end.y])

        return (endData[1] - startData[1]) / (endData[0] - startData[0])
    }
}

var app = new Vue({
    el: '.data-table',
    data: {
        sourceData: [
            [30, 4],
            [40, 5],
            [45, 5],
            [50, 5.6],
            [60, 6],
            [65, 7.5],
            [70, 8.],
            [75, 8.5],
            [80, 8.75]
        ],
        margin: 40,
        interactive: undefined,
        xform: undefined,
        transformedData: undefined,
        numFormatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })
    },
    methods: {
        predict(temp) {
            return 0.0
        },
        error(temp, actual) {
            return this.predict(temp) - actual
        }
    },
    mounted() {
        this.interactive = new Interactive("my-interactive", {
            width: 600,
            height: 400,
            originX: this.margin,
            originY: 400 - this.margin
        })
        this.xform = new Transformer(this.interactive)
        this.transformedData = this.xform.setup(this.sourceData)

        let coord = this.xform.toSVG([0, this.xform.ymin])
        let start = this.interactive.control(coord[0], coord[1])

        coord = this.xform.toSVG([0, this.xform.ymax])
        let end = this.interactive.control(this.interactive.width - 2 * this.margin, coord[1])
        let line = this.interactive.line(start.x, start.y, end.x, end.y)

        let xAxis = this.interactive.line(0, 0, this.interactive.width - this.margin, 0);
        let yAxis = this.interactive.line(0, 0, 0, -this.interactive.height + this.margin);
        let marker = this.interactive.marker(10, 5, 10, 10);
        marker.path('M 0 0 L 10 5 L 0 10 z').style.fill = '#404040';
        marker.setAttribute('orient', 'auto-start-reverse');
        xAxis.setAttribute('marker-end', `url(#${marker.id})`);
        yAxis.setAttribute('marker-end', `url(#${marker.id})`);

        start.constrainToY()
        end.constrainToY()

        end.addDependency(start)
        end.update = function () {
            end.y = end.y + start.dy
        }

        line.addDependency(start)
        line.addDependency(end)
        line.update = () => {
            line.x1 = start.x;
            line.y1 = start.y;
            line.x2 = end.x;
            line.y2 = end.y;
        }

        coord = this.xform.fromSVG([0, start.y])
        let bValue = this.interactive.text(start.x + 10, start.y + 10, `b: ${this.numFormatter.format(coord[1])}`)
        bValue.addDependency(start)
        bValue.update = () => {
            bValue.y += start.dy

            let pair = this.xform.fromSVG([0, start.y])

            bValue.contents = `b: ${this.numFormatter.format(pair[1])}`
        }

        let slope = this.xform.getSlope(start, end)
        let wValue = this.interactive.text(end.x - 80, end.y - 10, `W: ${this.numFormatter.format(slope)}`)
        wValue.addDependency(end)
        wValue.update = () => {
            wValue.y += end.dy
            let slope = this.xform.getSlope(start, end)
            wValue.contents = `W: ${this.numFormatter.format(slope)}`
        }

        this.transformedData.forEach(pair => {
            this.interactive.circle(pair[0], pair[1], 5)
        })

        let xLabel = this.interactive.text(100, -10, "Foot Traffic/hr")
        xLabel.setAttribute('transform', `rotate(${-90})`)
        let yLabel = this.interactive.text(200, 20, "Temperature (F)")
    }
})