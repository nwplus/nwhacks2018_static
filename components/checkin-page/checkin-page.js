class CheckinPage extends Polymer.Element {
  static get is () { return 'checkin-page' }

  static get properties () {
    return {
      displayID: {
        value: ''
      },

      lunr: {
        type: Object,
        value: false
      },

      deviceid: {
        computed: '_computeDeviceID(deviceItem)'
      }
    }
  }

  static get observers () {
    return [
      'handleRegistrations(registrations)',
      'handleForm(form)',
      'handleSearch(query, lunr)',
      'updateWaitlist(display.dayof_waitlist)',
      'updateDisplay(display)'
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

    for (const e of this.root.querySelectorAll("paper-textarea")) {
      e.addEventListener('keydown', (e) => {
        e.stopPropagation()
      })
    }

    this.keyHandler = this.keyHandler.bind(this)
    document.addEventListener('keydown', this.keyHandler)

    let data = ''
    let started = false
    let timeout = null
    this._cardListener = window.addEventListener('keydown', (e) => {
      if (e.key === ';' || e.key === '+' || e.key === '%') {
        data = ''
        started = true
        if (timeout) {
          clearTimeout(timeout)
        }
        timeout = setTimeout(() => {
          started = false
          timeout = null
        }, 1000)
      }
      if (!started) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (this.printableKey(e.keyCode)) {
        if (e.key === 'Enter') {
          data += '\n'
        } else {
          data += e.key
        }
      }
      if (data.slice(-2) === '?\n' && e.key === 'Enter') {
        this.checkCard(data)
        started = false
      }
    })
  }

  disconnectedCallback () {
    super.disconnectedCallback()

    window.removeEventListener(this._cardListener)
    document.removeEventListener('keydown', this.keyHandler)
  }

  handleForm (form) {
    this.displayID = ''
    this.lunr = null
  }

  checkCard (data) {
    const parts = data.match(/[%;+](\d+)=(\d+)=(\d+)\?/)
    if (!parts || parts.length !== 4) {
      console.log('unknown card format!', data, parts)
      return;
    }
    const studentNumber = parts[2]
    console.log('student number', studentNumber)
    if (!this.registrations) {
      return
    }

    let index = -1
    this.registrations.forEach((hacker, i) => {
      if (hacker.student_number == studentNumber) {
        index = i
      }
    })
    if (index < 0) {
      alert(`Can't find student number ${studentNumber}`)
      return
    }
    this.setDisplay(index)
  }

  printableKey (keycode) {
    return (keycode > 47 && keycode < 58)   || // number keys
      keycode === 32 || keycode === 13 || // spacebar & return key(s) (if you want to allow carriage returns)
      (keycode > 64 && keycode < 91)   || // letter keys
      (keycode > 95 && keycode < 112)  || // numpad keys
      (keycode > 185 && keycode < 193) || // ;=,-./` (in order)
      (keycode > 218 && keycode < 223)   // [\]' (in order)
  }

  _computeDeviceID (deviceItem) {
    if (!deviceItem) {
      return
    }
    return deviceItem.deviceid
  }

  keyHandler (e) {
    if (e.key === '/') {
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
    this.setDisplay(id)
  }

  setDisplay (id) {
    const registration = this.registrations[id]
    this.setProperties({
      displayID: registration.$key,
      query: '',
      autocomplete: []
    })
    this.$.search.blur()
  }

  updateDisplay (display) {
    if (!display) {
      return
    }

    if (display.checked_in === undefined) {
      display.checked_in = false
    }

    if (this.device && this.device.id) {
      this.set('device.write_id', this.displayID)
      this.set('device.write_form', this.form)
      this.set('device.write_name', `${display.first_name} ${display.last_name}`)
    }
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
      this.displayID = ''
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
    if (!hacker) {
      return
    }
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
    const status = this.displayStatus(hacker)
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

  updateWaitlist (waitlist) {
    if (!waitlist) {
      return
    }
    this.set('display.dayof_waitlist_time',  moment().toISOString())
  }

  formatEmail (email) {
    if (!email) {
      return
    }
    return email.replace(/\./g, '%2E')
  }

  sortName (devices) {
    return devices.sort((a, b) => {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
    })
  }
}

customElements.define(CheckinPage.is, CheckinPage)
