'use strict'

const categories = ['applied', 'accepted', 'waitlisted', 'rejected']
Object.freeze(categories)
const responseCategories = ['no response', 'going', 'not going', 'need reimbursement']
Object.freeze(responseCategories)

const formComponentOverride = {
  'registration': 'register'
}
Object.freeze(formComponentOverride)

const weakSubmitted = new WeakMap()

class SelectHackers extends Polymer.Element {
  static get is () { return 'select-hackers' }

  static get properties () {
    return {
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

      categories: {
        type: Array,
        value: categories
      },

      bulk_tags: {
        type: Object,
        value () {
          return {}
        }
      },

      filters: {
        type: Object,
        value () {
          return {
            scoreMax: 20,
            scoreMin: 0,
            firstN: 0,
            showBlacklisted: false
          }
        }
      },

      filterDefaults: {
        type: Object,
        value () {
          return {
            scoreMax: 20,
            scoreMin: 0,
            firstN: 0,
            showBlacklisted: false
          }
        }
      },

      sorts: {
        type: Object,
        value () {
          return {
            Relevance: function (a) {
              return a
            },

            Score: function (a) {
              return a.sort((a, b) => {
                return ((a.criteria && a.criteria.score) || 0) - ((b.criteria && b.criteria.score) || 0)
              })
            },

            ID: function (a) {
              a.sort((a, b) => {
                return a.$key < b.$key ? -1 : 1
              })
              return a
            },

            Name: function (a) {
              a.sort((a, b) => {
                return (a.first_name + ' ' + a.last_name).toLowerCase() < (b.first_name + ' ' + b.last_name).toLowerCase() ? -1 : 1
              })
              return a
            },

            "Day Of Waitlist": function (a) {
              a.sort((a, b) => {
                return a.dayof_waitlist_time < b.dayof_waitlist_time ? -1 : 1
              })
              return a
            }
          }
        }
      },

      sort: String,
      sortAsc: {
        type: Boolean,
        value: false
      },

      isAdmin: {
        value: false
      },

      responseCategories: {
        type: Array,
        value: responseCategories
      },

      route: String,
      routeData: Object,
      subRoute: String,

      lunr: {
        type: Object,
        value: false
      }
    }
  }

  static get observers () {
    return [
      'handleRegistrations(registrations)',
      'handleRegistrations(registrations.*)',
      'filter(hackers, filters, blacklist, hackers.*, filters.*, sort, sortAsc)',
      'getQuestionMapping(form)',
      'handleRouteData(routeData.form, routeData.sid)'
    ]
  }

  constructor () {
    super()

    this.sort = Object.keys(this.sorts)[0]
    this.target = document.body
  }

  sortIcon (sortAsc) {
    return sortAsc ? "arrow-upward" : "arrow-downward"
  }

  changeSortDir () {
    this.sortAsc = !this.sortAsc
  }

  selected (sid1, sid2) {
    return sid1 === sid2
  }

  handleRouteData (form, sid) {
    if (!form || !sid) {
      return
    }

    this.setProperties({
      form,
      sid
    })
  }

  cleanEmail (email) {
    return (email || '').toLowerCase().trim()
  }

  keys (a) {
    return Object.keys(a)
  }

  handleRegistrations () {
    if (this.lastRender) {
      clearTimeout(this.lastRender)
    }
    this.lastRender = setTimeout(this.handleRegistrationsInternal.bind(this), 300)
  }

  hasPrefix (a, prefix) {
    return a.slice(0, prefix.length) === prefix
  }

  bulkSetTags () {
    const tags = this.$.bulktags.list().map(a => a.slug || a.name)
    const hackers = this.filtered
    if (!confirm(`You are about to add tags to ${hackers.length} entries.
        Tags: ${tags.join(', ')}`)) {
      return
    }
    for (const tag of tags) {
      this.tag(tag, hackers, false)
    }
  }

  bulkRemoveTags () {
    const tags = this.$.bulktags.list().map(a => a.slug || a.name)
    const hackers = this.filtered
    if (!confirm(`You are about to remove tags from ${hackers.length} entries.
        Tags: ${tags.join(', ')}`)) {
      return
    }
    for (const tag of tags) {
      this.tag(tag, hackers, true)
    }
  }

  tag (tag, hackers, clear) {
    const regs = this.$.regs
    const value = clear ? null : true
    for (const hacker of hackers) {
      const path = `${regs.path}/${hacker.$key}/tags/${tag}`
      regs.setStoredValue(path, value)
    }
  }

  handleRegistrationsInternal () {
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

    console.log('updated')
    this.hackers = hackers
  }

  weakSubmitted (hacker) {
    if (!weakSubmitted.has(hacker)) {
      const submitted = moment(hacker.submitted || 0)
      weakSubmitted.set(hacker, submitted)
    }
    return weakSubmitted.get(hacker)
  }

  numFilters (filters) {
    if (!filters) {
      return
    }
    let count = 0
    for (const filter of Object.keys(filters)) {
      if (filter !== 'search' && filters[filter] && this.filterDefaults[filter] != filters[filter]) {
        count += 1
      }
    }
    return count
  }

  index (hacker) {
    return hacker.index
  }

  updateEmailIndex (hackers) {
    const emailIndex = {}
    hackers.forEach((hacker) => {
      if (hacker.duplicate) {
        return
      }
      emailIndex[hacker.cleanEmail] = hacker
    })
    this.emailIndex = emailIndex
  }

  filterFields (fields, questions) {
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
  }

  updateLunrIndex (hackers) {
    if (this.lastLunrIndexCount === hackers.length || hackers.length === 0) {
      return
    }
    this.lastLunrIndexCount = hackers.length

    const fields = new Set()
    hackers.forEach((hacker) => {
      for (const field of Object.keys(hacker)) {
        const type = typeof hacker[field]
        if (type === 'object') {
          continue
        }
        fields.add(field)
      }
    })

    const blacklist = new Set([
      '$key', 'index', 'id', 'birthday', 'submitted', 'resume', 'phone',
      'emergency_phone', 'cleanEmail'
    ])
    this.fields = Array.from(fields).filter(a => {
      return !blacklist.has(a)
    })

    const builder = new lunr.Builder()
    builder.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer)
    builder.searchPipeline.add(lunr.stemmer)
    builder.ref('index')
    for (const field of this.fields) {
      builder.field(field)
    }
    this.asyncBuildIndex(builder, hackers)
  }

  asyncBuildIndex (builder, hackers) {
    if (!hackers || hackers.length === 0) {
      this.lunr = builder.build()
      this.pruneIndex(this.lunr)
      console.log('asyncBuildIndex: done!')
      return
    }

    requestIdleCallback(() => {
      const batchSize = 25
      hackers.slice(0, batchSize).forEach((hacker) => {
        builder.add(hacker)
      })
      this.asyncBuildIndex(builder, hackers.slice(batchSize))
    }, {
      timeout: 100
    })
  }

  pruneIndex (index) {
    const empty = {}
    const handler = {
      get: function (target, name, receiver) {
        return target[name] || empty
      }
    }

    for (const key of Object.keys(index.invertedIndex)) {
      const val = index.invertedIndex[key]
      for (const field of Object.keys(val)) {
        if (field === '_index') {
          continue
        }

        if (Object.keys(val[field]).length === 0) {
          delete val[field]
        }
      }
      index.invertedIndex[key] = new Proxy(val, handler)
    }
  }

  clearSearch () {
    this.set('filters.search', '')
  }

  responseCat (i) { return this.responseCategories[i] }

  export () {
    const flat = this.filtered.map(a => JSON.parse(JSON.stringify(this.flatten(a, false))))
    var csv = CSV.encode(flat, {header: true})
    this.downloadFile('applicants_export.csv', csv)
  }

  downloadFile (filename, content) {
    var blob = new Blob([content], {
      type: 'text/csv;charset=utf-8'
    })
    window.saveAs(blob, filename)
  }

  title (hacker) {
    return hacker.name || hacker.first_name + ' ' + hacker.last_name
  }

  filter (hackers, filters, blacklist) {
    if (!this.sort) {
      return
    }

    var filtered = hackers
    this.totalCount = hackers.length
    if (filters.search && filters.search.length >= 1) {
      var rawResults = this.lunr.search(filters.search)
      filtered = rawResults.map((result) => {
        return hackers[result.ref]
      })
    }

    const blacklistEmails = new Set()
    blacklist.forEach((entry) => {
      blacklistEmails.add(this.cleanEmail(entry.email))
    })

    let submitted_before = moment(filters.submitted_before || 0)
    let submitted_after = moment(filters.submitted_after || 0)

    this.jsEvalError = ''
    let expressionFilter
    if (filters.jsEval) {
      try {
        expressionFilter = compileExpression(filters.jsEval)
      } catch (e) {
        this.jsEvalError = e.toString()
      }
    }

    filtered = filtered.filter((hacker) => {
      if (hacker.duplicate) {
        return false
      }

      let valid = true

      if (filters.scoreMin !== this.filterDefaults.scoreMin) {
        valid = valid && hacker.criteria && hacker.criteria.score >= filters.scoreMin
      }
      if (filters.scoreMax !== this.filterDefaults.scoreMax) {
        valid = valid && hacker.criteria && hacker.criteria.score <= filters.scoreMax
      }
      if (filters.tag) {
        valid = valid && hacker.tags && hacker.tags.hasOwnProperty(filters.tag)
      }
      if (filters.no_tag) {
        valid = valid && (!hacker.tags || !hacker.tags.hasOwnProperty(filters.no_tag))
      }
      if (filters.submitted_after) {
        valid = valid && this.weakSubmitted(hacker) >= submitted_after
      }
      if (filters.submitted_before) {
        valid = valid && this.weakSubmitted(hacker) <= submitted_before
      }
      if (filters.missingCriteria) {
        valid = valid && (!hacker.criteria || !hacker.criteria[filters.missingCriteria])
      }
      if (filters.jsEval && expressionFilter) {
        valid = valid && expressionFilter(this.flatten(hacker, true))
      }
      if (!filters.showBlacklisted) {
        valid = valid && !blacklistEmails.has(hacker.cleanEmail)
      }

      return valid
    })

    filtered = this.sorts[this.sort].call(this, filtered)
    if (this.sortAsc) {
      filtered = filtered.reverse()
    }

    const firstN = parseInt(filters.firstN || '')
    if (firstN) {
      filtered = filtered.slice(0, firstN)
    }

    hackers.forEach((hacker, i) => {
      hacker.index = i
    })

    // Maintain scroll position
    const scroll = this.$.list.scrollTop
    console.log('filtered')
    this.filtered = filtered
    this.filteredCount = filtered.length
    this.$.list.scroll(0, scroll)

    filtered.forEach((hacker, i) => {
      this.linkPaths(['filtered', i], ['registrations', hacker.index])
    })
  }

  flatten (obj, intermediate) {
    const to = {}
    this._flatten(to, obj, '', intermediate)
    return to
  }

  _flatten (to, obj, path, intermediate) {
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (path) {
          this._flatten(to, obj[key], path + '.' + key, intermediate)
        } else {
          this._flatten(to, obj[key], key, intermediate)
        }
      }
      if (intermediate) {
        to[path] = true
      }
    } else {
      to[path] = obj
    }
  }

  handleNext () {
    this.selectMove(1)
  }

  handlePrev () {
    this.selectMove(-1)
  }

  select (e) {
    this.setSID(e.model.hacker.$key)
  }

  selectMove (dir) {
    const hacker = this.hackerBySID(this.sid)
    if (!hacker) {
      return
    }
    const filteredIndex = this.filtered.indexOf(hacker)
    if (filteredIndex === -1) {
      return
    }
    const newIndex = (filteredIndex + dir) % this.filtered.length
    const newHacker = this.filtered[newIndex]
    if (!newHacker) {
      return
    }

    this.setSID(newHacker.$key)

    const list = this.$.list
    if (list.lastVisibleIndex < newIndex || list.firstVisibleIndex > newIndex) {
      list.scrollToIndex(newIndex)
    }
  }

  hackerBySID (sid) {
    for (const hacker of this.hackers) {
      if (!hacker.duplicate && hacker.$key === sid) {
        return hacker
      }
    }
  }

  setSID (sid) {
    this.sid = sid
    this.set('route.path', `/${this.form}/${sid}`)
  }

  showFilters () {
    this.$.filterhelp.open()
  }

  getQuestionMapping (form) {
    form = formComponentOverride[form] || form
    const elemName = form + '-form'
    const pageURL = 'components/' + elemName + '/' + elemName + '.html'

    // import form element.
    Polymer.importHref(pageURL, () => {
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

  openBulkDialog () {
    this.$.bulkactions.open()
  }
}

customElements.define(SelectHackers.is, SelectHackers)
