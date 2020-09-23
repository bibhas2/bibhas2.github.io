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

Vue.component('gd-tool', {
    template: `
    <div class="data-table">
    <div class="table-description">
      Correlation of Foot Traffic (Customers/hour) with Temperature.
    </div>
    <div class="table-header">Temperature<br />(x)</div>
    <div class="table-header">Actual<br />Foot Traffic<br />(y)</div>
    <div class="table-header">Predicted<br />Foot Traffic<br />(y')</div>
    <div class="table-header">Error<br/>(y - y')</div>
    <template v-for="sample in sourceData">
      <div class="data-cell">{{fmt(sample[0])}}</div>
      <div class="data-cell">{{fmt(sample[1])}}</div>
      <div class="data-cell">{{fmt(predict(sample[0]))}}</div>
      <div class="data-cell">{{fmt(error(sample[0], sample[1]))}}</div>
    </template>
    <div class="rmse-label">
      Root Mean Square Error (RMSE)
    </div>
    <div class="rmse-value">{{rmseFormatted}}</div>
    </div>
    `,
    data() {
        return {
            sourceData: [
                [30, 6.5],
                [40, 9],
                [45, 9],
                [50, 9.6],
                [60, 10],
                [65, 11.5],
                [70, 12.],
                [75, 12.5],
                [80, 14.75]
            ],
            margin: 40,
            interactive: undefined,
            xform: undefined,
            transformedData: undefined,
            numFormatter: new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }),
            W: 0,
            b: 0,
            rmse: 0,
        }
    },
    methods: {
        predict(temp) {
            return this.W * temp + this.b
        },
        error(temp, actual) {
            return this.predict(temp) - actual
        },
        fmt(n) {
            return this.numFormatter.format(n)
        },
        updateRMSE() {
            const sumErrorSquared = this.sourceData.reduce((sum, pair) => {
                const err = this.error(pair[0], pair[1])

                return sum + (err * err)
            }, 0.0)

            this.rmse = sumErrorSquared / (2 * this.sourceData.length)
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
        this.b = coord[1]
        let bValue = this.interactive.text(start.x + 10, start.y + 10, `b: ${this.fmt(this.b)}`)
        bValue.addDependency(start)
        bValue.update = () => {
            bValue.y += start.dy

            let pair = this.xform.fromSVG([0, start.y])
            this.b = pair[1]
            bValue.contents = `b: ${this.fmt(this.b)}`

            this.updateRMSE()
        }

        this.W = this.xform.getSlope(start, end)
        let wValue = this.interactive.text(end.x - 80, end.y - 10, `W: ${this.fmt(this.W)}`)
        wValue.addDependency(end)
        wValue.update = () => {
            wValue.y += end.dy
            this.W = this.xform.getSlope(start, end)
            wValue.contents = `W: ${this.fmt(this.W)}`

            this.updateRMSE()
        }

        this.transformedData.forEach(pair => {
            this.interactive.circle(pair[0], pair[1], 5)
        })

        let xLabel = this.interactive.text(75, -10, "Foot Traffic. (Customers/hr)")
        xLabel.setAttribute('transform', `rotate(${-90})`)
        let yLabel = this.interactive.text(200, 20, "Temperature (F)")

        this.updateRMSE()
    },
    computed: {
        rmseFormatted() {
            return this.fmt(this.rmse)
        }
    },
})
