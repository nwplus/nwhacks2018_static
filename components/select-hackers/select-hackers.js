'use strict'

const categories = ['applied', 'accepted', 'waitlisted', 'rejected']
Object.freeze(categories)
const responseCategories = ['no response', 'going', 'not going', 'need reimbursement']
Object.freeze(responseCategories)

Polymer({
  is: 'select-hackers',

  properties: {
    hackers: {
      type: Array,
      value: []
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

    responseCategories: {
      type: Array,
      value: responseCategories
    }
  },

  refresh: function () { this.incr++ },

  attached: function () {
    var self = this
    setTimeout(function () { self.resize() }, 100)
    window.addEventListener('resize', function () { self.resize() })
    this.getQuestionMapping('register-form')
  },

  resize: function () {
    var top = this.$.list.getBoundingClientRect().top
    this.$.list.style.height = window.innerHeight - top + 'px'
  },

  observers: [
    'refresh(filters.status)',
    'refresh(filters.checked_in)',
    'refresh(filters.response)',
    'refresh(filters.search)',
    'refresh(filters.mentor)',
    'refresh(filters.first)',
    'refresh(filters.reimbursement)',
    'refresh(filters.missing_passport)',
    'handleRegistrations(registrations)',
    'handleRegistrations(registrations.*)',
    'handlePartials(registrations.*)',
    'filter(hackers, filters, incr, hackers.*)'
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
    const hackers = this.registrations.map((a) => {
      a.id = a.$key
      return a
    })
    hackers.sort(function (a, b) { return a.id < b.id ? -1 : 1 })

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

    this.clusters = this.clusterTeams(hackers)

    // Update search
    this.updateLunrIndex(hackers)

    console.log('hackers update')
    this.hackers = hackers
  },

  // clusterTeams returns a {[email: string]: Set[email: string]}
  clusterTeams: function (hackers) {
    const clusters = {}
    hackers.forEach((hacker) => {
      if (hacker.duplicate || !hacker.teammates || hacker.teammates.trim().length === 0) {
        return
      }
      const teammates = hacker.teammates.split(',').map((a) => this.cleanEmail(a))
      teammates.forEach((teammate) => {
        if (!this.emailIndex[teammate]) {
          return
        }
        this.addPersonToCluster(clusters, hacker.cleanEmail, teammate)
      })
    })
    return clusters
  },

  addPersonToCluster: function (clusters, key, email) {
    const targetCluster = (clusters[key] || new Set())
    const existingCluster = clusters[email]
    targetCluster.add(key)
    targetCluster.add(email)
    if (existingCluster && targetCluster !== existingCluster) {
      existingCluster.forEach((e) => {
        targetCluster.add(e)
        clusters[e] = targetCluster
      })
    }
    clusters[key] = targetCluster
    clusters[email] = targetCluster
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

  updateLunrIndex: function (hackers) {
    if (this.lastLunrIndexCount === hackers.length) {
      return
    }
    this.lastLunrIndexCount = hackers.length

    const search = lunr(function () {
      this.ref('index')
      this.field('id')
      this.field('city')
      this.field('email')
      this.field('emailSplit')
      this.field('github')
      this.field('personalsite')
      this.field('linkedin')
      this.field('name')
      this.field('reason')
      this.field('school')
      this.field('teammates')
    })
    hackers.forEach(function (hacker, i) {
      hacker.emailSplit = hacker.email.replace(/@/g, ' ')
      search.add(hacker)
    })
    this.lunr = search
  },

  responseCat: function (i) { return this.responseCategories[i] },
  export: function () {
    const copy = JSON.parse(JSON.stringify(this.filtered))
    copy.forEach((hacker) => {
      hacker.resume = this.resumeLink(hacker.resume)
    })
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
    const name = hacker.name || hacker.first_name + ' ' + hacker.last_name
    return name + ' (' + hacker.email + ')'
  },

  filter: function (hackers, filters, _) {
    var results = hackers
    this.totalCount = hackers.length
    if (filters.search.length >= 3) {
      var rawResults = this.lunr.search(filters.search)
      results =
          rawResults.map(function (result) { return hackers[result.ref] })
    }
    var status = filters.status
    var response = filters.response
    var responseIdx = this.responded(response)
    var filtered = results.filter((hacker, b, c) => {
      var good = (status === '' || status === 'null' || status === 'All' ||
                  status === hacker.status) &&
          (response === '' || response === 'null' || response === 'All' ||
           this.respondedWith(hacker, responseIdx)) && !hacker.duplicate
      if (filters.mentor) {
        good = good && hacker.mentor
      }
      if (filters.checked_in) {
        good = good && hacker.checked_in
      }
      if (filters.reimbursement) {
        good = good && hacker.travel_reimbursement
      }
      if (filters.first) {
        good = good && hacker.first_hackathon
      }
      if (filters.missing_passport) {
        good = good && hacker.rsvp && hacker.rsvp.passport === 'No'
      }
      return good
    })

    filtered.forEach((hacker, i) => {
      hacker.filteredIndex = i
    })

    // Maintain scroll position
    const scroll = this.$.list.scrollTop
    this.filtered = filtered
    this.filteredCount = filtered.length
    this.$.list.scroll(0, scroll)
  },

  resumeLink: function (resume) {
    return 'https://firebasestorage.googleapis.com/v0/b/nwhacks-96701.appspot.com/o/' + encodeURIComponent(resume) + '?alt=media'
  },

  githubLink: function (username) {
    if (!username) {
      return
    }
    if (username.indexOf('github.com') > 0) {
      return username
    }
    return 'https://github.com/' + username
  },

  linkedinLink: function (username) {
    if (!username) {
      return
    }
    if (username.indexOf('linkedin.com') > 0) {
      return username
    }
    return 'https://linkedin.com/in/' + username
  },

  selected: function (status) {
    var index = categories.indexOf(status)
    if (index >= 0) {
      return index
    }
    return 0
  },

  responded: function (status) {
    var index = responseCategories.indexOf(status)
    if (index >= 0) {
      return index
    }
    return 0
  },

  eq: function (a, b) { return a === b },

  respondedWith: function (hacker, response) {
    if (!hacker.acceptance_sent || hacker.status !== 'accepted') {
      return false
    }
    return (hacker.rsvp ? 1 : 0) === response
  },

  onSelect: function (e) {
    const status = e.target.value
    const hacker = e.model.hacker
    this.setHackerStatus(hacker, status)
  },

  onSelectTeam: function (e) {
    const status = e.target.value
    e.target.value = ''
    const hacker = e.model.hacker
    const teammates = this.teammates(hacker)
    teammates.forEach((email) => {
      const h = this.emailIndex[email]
      this.setHackerStatus(h, status)
    })
  },

  setHackerStatus: function (hacker, status) {
    if (categories.indexOf(status) === -1) {
      console.log('ignoring status:', status)
      return
    }

    if (hacker.status !== status) {
      this.set('filtered.' + hacker.filteredIndex + '.status', status)
      this.patchHacker(hacker)
    }
  },

  phoneChange: function (e) {
    var hacker = e.model.hacker
    this.patchHacker(hacker)
  },
  checkIn: function (e) {
    var hacker = e.model.hacker
    this.patchHacker(hacker)
  },
  patchHacker: function (hacker) {
    delete hacker.$key
    this.$.regs.setStoredValue('/registrations/' + hacker.id, hacker)
  },
  refreshList: function () { this.incr++ },
  handleErr: function (a, b, c) { this.handleError(a, b.error) },
  hackerAdminURL: function (hacker) {
    return '/api/admin/nwhacks/registration/' + hacker.id + '/change/'
  },
  handleError: function (e, err) {
    console.log('Error', err)
    this.error = err
    this.$.error.open()
  },

  hasTeammates: function (hacker) {
    return !!this.clusters[hacker.cleanEmail]
  },

  teammates: function (hacker) {
    const cluster = this.clusters[hacker.cleanEmail]
    if (cluster) {
      return Array.from(cluster).sort()
    }
    return []
  },

  scrollToEmail: function (e) {
    const email = e.model.item
    this.filtered.forEach((hacker, i) => {
      if (hacker.cleanEmail === email) {
        this.$.list.scrollToIndex(i)
      }
    })
  },

  acceptanceSent: function (hacker) {
    return hacker.acceptance_sent && hacker.status === 'accepted'
  },

  rsvpLink: function (hacker) {
    return '/rsvp/' + hacker.id + '#begin'
  },

  resetRSVPTime: function (e) {
    const hacker = e.model.hacker
    e.model.set('hacker.acceptance_sent.Time', moment().format())
    this.patchHacker(hacker)
  },

  timeTo: function (time) {
    return moment(time).add(7, 'days').fromNow()
  },

  firebaseLink: function (id) {
    if (!id) {
      return
    }
    return 'https://console.firebase.google.com/project/nwhacks-96701/database/data/registrations/' + id
  },

  getQuestionMapping: function (name) {
    const elem = document.createElement(name)
    elem.style.display = 'none'
    document.body.append(elem)
    let q = [elem]
    while (q.length > 0) {
      const e = q.pop()
      q = q.concat(Array.from(e.children))
      if (e.root) {
        q = q.concat(Array.from(e.root.children))
      }
      if (e.validate && e.label) {
        e.value = e.label
        e.checked = e.label
        e.selectedItemLabel = e.label
        console.log(e.label, e)
      }
    }
    setTimeout(() => {
      debugger
      elem.remove()
    }, 10);
  }
})
