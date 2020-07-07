Vue.component("book", {
    template: `
<div>
    <img :src="currentFile" class="page" @click="next($event)"/>
</div>
    `,
    props: [
        "baseFileName",
        "extension",
        "firstPage",
        "lastPage"
    ],
    data() {
        return {
            currentPage: 0
        }
    },
    mounted() {
        this.currentPage = this.firstPage
    },
    methods: {
        next(e) {
            if (this.currentPage < this.lastPage) {
                this.currentPage += 1
            }
        },
        prev(e) {

        }
    },
    computed: {
        currentFile() {
            return `${this.baseFileName}${this.currentPage}.${this.extension}`
        }
    }
})