export let Component

// let jsanParse
let devTools
let persistedStore

try {
  Component = require("react").Component
} catch (error) { /* Fail silent */ }
try {
  Component = require("inferno").Component
} catch (error) { /* Fail silent */ }

if (!Component) {
  throw 'Please require Inferno or React'
}

if (process.env.NODE_ENV !== 'production') {
  console.error(`You're currently using a development version of Laco`)
  // jsanParse = require('jsan').parse
  if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect()
    // const persistedStore = jsanParse(localStorage.getItem('__LACO__'))
    persistedStore = JSON.parse(localStorage.getItem('__LACO__'))
    if (persistedStore) {
      devTools.init(persistedStore)
    }
  }
}

let STORE = {}
let COUNTER = 0

export class Store {
  idx
  name = ''
  _listeners = []
  devTools

  constructor(initialState: Object, name?: string) {
    if (name) this.name = name
    this.idx = COUNTER++
    STORE[this.idx] = initialState

    if (process.env.NODE_ENV !== 'production') {
      if (devTools) {
        if (persistedStore) {
          STORE[this.idx] = persistedStore[this.idx]
        }
        
        devTools.subscribe((message) => {
          switch (message.payload && message.payload.type) {
            case 'JUMP_TO_STATE':
            case 'JUMP_TO_ACTION':
              this.setState(JSON.parse(message.state)[this.idx])
              // this.setState(jsanParse(message.state)[this.idx])
          }
        })
      }
    }
  }
  
  // getGlobalStore() {
  //   return STORE
  // }

  getState() {
    return STORE[this.idx]
  }

  setState(state: Object | Function, info?: String) {
    STORE[this.idx] = typeof state === 'function'
      ? state(STORE[this.idx])
      : { ...STORE[this.idx], ...state }

    if (process.env.NODE_ENV !== 'production') {
      localStorage.setItem('__LACO__', JSON.stringify(STORE))
      if (devTools) {
        devTools.send(this.name ? this.name + ' - ' + info : info, STORE)
      }
    }

    this._listeners.forEach(fn => fn())
  }

  subscribe(fn) {
    this._listeners.push(fn)
  }

  unsubscribe(fn) {
    this._listeners = this._listeners.filter(f => f !== fn)
  }

  dispatch(value: any, info: string) {
    if (process.env.NODE_ENV !== 'production') {
      if (devTools) {
        devTools.send(this.name ? this.name + ' - ' + info : info, STORE)
      }
    }
    return value
  }
}

export class Subscribe extends Component<any, any> {
  stores = []

  componentWillReceiveProps() {
    this._unsubscribe()
  }

  componentWillUnmount() {
    this._unsubscribe()
  }

  _unsubscribe() {
    this.stores.forEach(store => {
      store.unsubscribe(this.onUpdate)
    })
  }

  onUpdate = () => {
    this.setState({})
  }

  render() {
    let stores = []

    const states = this.props.to.map(store => {
      store.unsubscribe(this.onUpdate)
      store.subscribe(this.onUpdate)
      
      stores.push(store)

      return store.getState()
    })

    this.stores = stores
    return (this.props as any).children(...states)
  }
}

export function dispatch(value: any, info: string) {
  if (process.env.NODE_ENV !== 'production') {
    if (devTools) {
      devTools.send(info, STORE)
    }
  }
  return value
}
