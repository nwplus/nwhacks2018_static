'use strict'

const categories = ['applied', 'accepted', 'waitlisted', 'rejected']
Object.freeze(categories)
const responseCategories = ['no response', 'going', 'not going', 'need reimbursement']
Object.freeze(responseCategories)

const formComponentOverride = {
  'registration': 'register'
}
Object.freeze(formComponentOverride)

Polymer({
  is: 'select-hackers',

  properties: {
    hackers: {
      type: Array,
      value: []
    },

    sid: {
      value: ''
    },

    questions: {
      type: Object
    },

    form: {
      type: String,
      value: 'registration'
    },

    incr: {
      type: Number,
      value: 0
    },

    categories: {
      type: Array,
      value: categories
    },

    filters: {
      type: Object,
      value: function () {
        return {
          search: '',
          status: '',
          response: '',
          missing_passport: false
        }
      }
    },

    isAdmin: {
      value: false
    },

    responseCategories: {
      type: Array,
      value: responseCategories
    }
  },

  refresh: function () { this.incr++ },

  observers: [
    'refresh(filters.search)',
    'handleRegistrations(registrations)',
    'handleRegistrations(registrations.*)',
    'handlePartials(registrations.*)',
    'filter(hackers, filters, incr, hackers.*)',
    'getQuestionMapping(form)'
  ],

  cleanEmail: function (email) {
    return (email || '').toLowerCase().trim()
  },

  handleRegistrations: function () {
    if (this.lastRender) {
      clearTimeout(this.lastRender)
    }
    this.lastRender = setTimeout(this.handleRegistrationsInternal.bind(this), 300)
  },

  handlePartials: function (change) {
    const path = change.path
    if (!this.hasPrefix(path, 'registrations.#')) {
      return
    }
    const bits = path.split('.')
    const item = bits.slice(0, 2).join('.')
    const hacker = this.get(item)
    const filteredIndex = hacker.filteredIndex
    if (this.filtered[filteredIndex] !== hacker) {
      return
    }
    const filteredPath = 'filtered.#' + filteredIndex + '.' + bits.slice(2).join('.')
    console.log(filteredPath)
    this.notifyPath(filteredPath)
  },

  hasPrefix: function (a, prefix) {
    return a.slice(0, prefix.length) === prefix
  },

  handleRegistrationsInternal: function () {
    console.log('rendering!')

    // Convert {[id]: hacker} to hacker[] sorted by ID.
    const hackers = this.registrations

    hackers.forEach((a) => {
      a.id = a.$key
    })

    // Deduplicate hackers
    var dedup = {}
    hackers.forEach((hacker, i) => {
      hacker.index = i

      const email = this.cleanEmail(hacker.email)
      hacker.cleanEmail = email
      const {count} = (dedup[email] || {count: 0})
      dedup[email] = {
        last: hacker.id,
        count: count + 1
      }
    })

    hackers.forEach((hacker, i) => {
      const {last, count} = dedup[hacker.cleanEmail]
      if (count > 1 && last !== hacker.id) {
        hacker.duplicate = true
      }
    })

    // Add required fields and unmunge status
    hackers.forEach((hacker) => {
      const lowerSchool = this.cleanEmail(hacker.school)
      if (lowerSchool.indexOf('secondary') >= 0 ||
          lowerSchool.indexOf('high') >= 0) {
        hacker.hs = true
      }
      if (!hacker.status) {
        hacker.status = 'applied'
      } else if (categories.indexOf(hacker.status) === -1) {
        hacker.status = categories[hacker.status]
      }
    })

    this.updateEmailIndex(hackers)


    // Update search
    this.updateLunrIndex(hackers)

    console.log('hackers update')
    this.hackers = hackers
  },

  index: function (hacker) {
    return hacker.index
  },

  updateEmailIndex: function (hackers) {
    const emailIndex = {}
    hackers.forEach((hacker) => {
      if (hacker.duplicate) {
        return
      }
      emailIndex[hacker.cleanEmail] = hacker
    })
    this.emailIndex = emailIndex
  },

  filterFields: function(fields, questions) {
    if (!fields || !questions) {
      return []
    }
    const qmap = {}
    for (const q of questions) {
      qmap[q.name] = q
    }
    const display = []
    for (const f of fields) {
      const q = qmap[f]
      if (q) {
        display.push(q)
      }
    }
    return display
  },

  updateLunrIndex: function (hackers) {
    if (this.lastLunrIndexCount === hackers.length) {
      return
    }
    this.lastLunrIndexCount = hackers.length

    const fields = new Set()
    hackers.forEach((hacker) => {
      for (const field of Object.keys(hacker)) {
        fields.add(field)
      }
    })
    this.fields = Array.from(fields)

    const builder = new lunr.Builder()
    builder.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer)
    builder.searchPipeline.add(lunr.stemmer)
    builder.ref('index')
    builder.field('emailSplit')
    for (const field of this.fields) {
      builder.field(field)
    }
    this.asyncBuildIndex(builder, hackers)
  },

  asyncBuildIndex: function (builder, hackers) {
    if (!hackers || hackers.length === 0) {
      this.lunr = builder.build()
      console.log('asyncBuildIndex: done!')
      return
    }

    requestIdleCallback(() => {
      const batchSize = 25
      hackers.slice(0, batchSize).forEach((hacker) => {
        hacker.emailSplit = hacker.email.replace(/@/g, ' ')
        builder.add(hacker)
      })
      this.asyncBuildIndex(builder, hackers.slice(batchSize))
    })
  },

  responseCat: function (i) { return this.responseCategories[i] },

  export: function () {
    const copy = JSON.parse(JSON.stringify(this.filtered))
    var csv = new CSV(copy, {header: true}).encode()
    this.downloadFile('applicants_export.csv', csv)
  },

  downloadFile: function (filename, content) {
    var blob = new Blob([content])
    const a = document.createElement('a')
    a.setAttribute('download', filename)
    a.setAttribute('href', URL.createObjectURL(blob))
    document.body.appendChild(a)
    a.click()
  },

  title: function (hacker) {
    return hacker.name || hacker.first_name + ' ' + hacker.last_name
  },

  filter: function (hackers, filters, _) {
    var filtered = hackers
    this.totalCount = hackers.length
    if (filters.search.length >= 1) {
      var rawResults = this.lunr.search(filters.search)
      filtered = rawResults.map((result) => {
        return hackers[result.ref]
      })
    }

    filtered.forEach((hacker, i) => {
      hacker.filteredIndex = i
    })

    // Maintain scroll position
    const scroll = this.$.list.scrollTop
    this.filtered = filtered
    this.filteredCount = filtered.length
    this.$.list.scroll(0, scroll)

    filtered.forEach((hacker, i) => {
      this.linkPaths(['filtered', i], ['registrations', hacker.index])
    })
  },

  select: function (e) {
    this.sid = e.model.hacker.$key
  },

  refreshList: function () { this.incr++ },

  handleErr: function (a, b, c) { this.handleError(a, b.error) },

  handleError: function (e, err) {
    console.log('Error', err)
    this.error = err
    this.$.error.open()
  },

  showFilters: function () {
    this.$.filterhelp.open()
  },

  getQuestionMapping: function (form) {
    form = formComponentOverride[form] || form
    const elemName = form + '-form'
    const pageURL = 'components/' + elemName + '/' + elemName + '.html'

    // import form element.
    this.importHref(pageURL, () => {
      const elem = document.createElement(elemName)
      elem.style.display = 'none'
      document.body.append(elem)

      const questions = []
      let q = [elem]
      while (q.length > 0) {
        const e = q.shift()

        if (e.validate && e.name) {
          questions.push({
            name: e.name,
            type: e.tagName.toLowerCase(),
            label: (e.label || e.textContent.trim().split("\n")[0]).trim()
          })
        }

        // Add element children to worklist.
        q = Array.from(e.children).concat(q)
        if (e.root) {
          q = Array.from(e.root.children).concat(q)
        }
      }
      this.questions = questions
      elem.remove()
    }, null, true)
  }
})
