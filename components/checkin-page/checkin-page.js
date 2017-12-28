class CheckinPage extends Polymer.Element {
  static get is () { return 'checkin-page' }

  static get properties () {
    return {
      display: {
        value: false
      },

      lunr: {
        type: Object,
        value: false
      }
    }
  }

  static get observers () {
    return [
      'handleRegistrations(registrations)',
      'handleSearch(query, lunr)',
      'updateStatus(display.checked_in)'
    ]
  }

  connectedCallback () {
    super.connectedCallback()

    this.$.search.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.code === 'ArrowDown') {
        this.autocompleteIndex = Math.min(this.autocompleteIndex + 1, this.autocomplete.length - 1)
      } else if (e.code === 'ArrowUp') {
        this.autocompleteIndex = Math.max(this.autocompleteIndex - 1, 0)
      } else if (e.code === 'Enter') {
        this.select()
      } else {
        return
      }
      e.preventDefault()
    })

    this.keyHandler = this.keyHandler.bind(this)
    document.addEventListener('keydown', this.keyHandler)
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    document.removeEventListener('keydown', this.keyHandler)
  }

  keyHandler (e) {
    console.log(e)
    if (e.code === 'Slash') {
      this.$.search.focus()
    } else if (e.code === 'Space' && this.display) {
      this.set('display.checked_in', !this.display.checked_in)
    } else {
      return
    }
    e.preventDefault()
  }

  handleTap (e) {
    this.autocompleteIndex = e.model.index
    this.select()
  }

  select () {
    const id = this.autocomplete[this.autocompleteIndex]
    if (!id) {
      return
    }
    this.displayID = id
    const display = this.registrations[id]
    if (display.checked_in === undefined) {
      display.checked_in = false
    }
    this.query = ''
    this.display = display
    this.linkPaths(['registrations', id], 'display')
    this.autocomplete = []
    this.$.search.blur()
  }

  heading (hacker) {
    return hacker.first_name + ' ' + hacker.last_name + ' <' + hacker.email + '>'
  }

  eq (a, b) {
    return a === b;
  }

  handleRegistrations (registrations) {
    if (!registrations) {
      return
    }
    this.updateDuplicateIndex(registrations)
    this.updateLunrIndex(registrations)
  }

  updateDuplicateIndex (registrations) {
    const keys = registrations.map(a => a.$key)
    // Deduplicate hackers
    const dedup = {};
    registrations.forEach((hacker, i) => {
      const email = this.cleanEmail(hacker.email)
      hacker.cleanEmail = email
      const {count} = (dedup[email] || {count: 0})
      dedup[email] = {
        last: hacker.id,
        count: count + 1
      };
    });

    const duplicateIndices = {};
    registrations.forEach((hacker, i) => {
      const {last, count} = dedup[hacker.cleanEmail]
      if (count > 1 && last !== hacker.id) {
        duplicateIndices[i] = true
      }
    })

    this.duplicateIndices = duplicateIndices
  }

  cleanEmail (email) {
    return (email || '').toLowerCase().trim()
  }

  handleSearch (query, lunr) {
    if (!query || !lunr) {
      return
    }

    const newAutocomplete = this.lunr.search(query).slice(0, 5).map((a) => a.ref)

    if (JSON.stringify(newAutocomplete) !== JSON.stringify(this.autocomplete)) {
      this.autocompleteIndex = 0
      this.autocomplete = newAutocomplete
      this.display = false
    }
  }

  updateLunrIndex (registrations) {
    if (!registrations) {
      return
    }

    const regCount = registrations.length
    if (regCount === 0 || this.lastLunrIndexCount === regCount) {
      return
    }
    this.lastLunrIndexCount = regCount

    var self = this

    const search = lunr(function() {
      this.ref('id')
      this.field('email')
      this.field('emailSplit')
      this.field('name')
      this.field('first_name')
      this.field('last_name')

      registrations.forEach((hacker, i) => {
        if (self.duplicateIndices[i] || !hacker.email) {
          return
        }

        this.add({
          id: i,
          email: hacker.email,
          emailSplit: hacker.email.replace(/\W+/g, ' '),
          name: hacker.name,
          first_name: hacker.first_name,
          last_name: hacker.last_name
        })
      })
    })

    this.lunr = search
  }

  name (registrations, id) {
    const hacker = registrations[id]
    return hacker.first_name + ' ' + hacker.last_name
  }

  email (registrations, id) {
    return registrations[id].email
  }

  warnStatus (hacker) {
    const status = this.displayStatus(hacker)
    return status === 'Accepted, No Response' || status === 'waitlisted'
  }

  dangerStatus (hacker) {
    const status = this.displayStatus(hacker);
    return status === 'rejected'
  }

  displayStatus (hacker) {
    if (hacker.status === 'accepted') {
      if (hacker.rsvp) {
        return 'accepted'
      } else {
        return 'Accepted, No Response'
      }
    }

    return hacker.status;
  }

  warnAge (age) {
    return age && age.indexOf('under') !== -1
  }

  updateStatus () {
    const firebase = this.querySelector('#regs')
    if (!firebase || !this.displayID || !this.display) {
      return
    }
    firebase.setStoredValue('/form/registration/' + this.displayID + '/checked_in', this.display.checked_in)
  }

  formatEmail (email) {
    if (!email) {
      return
    }
    return email.replace(/\./g, '%2E')
  }
}

customElements.define(CheckinPage.is, CheckinPage)
