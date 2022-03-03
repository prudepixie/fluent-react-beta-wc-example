/**
 * A reference to globalThis, with support
 * for browsers that don't yet support the spec.
 * @public
 */
const $global = function () {
  if (typeof globalThis !== "undefined") {
    // We're running in a modern environment.
    return globalThis;
  }

  if (typeof global !== "undefined") {
    // We're running in NodeJS
    return global;
  }

  if (typeof self !== "undefined") {
    // We're running in a worker.
    return self;
  }

  if (typeof window !== "undefined") {
    // We're running in the browser's main thread.
    return window;
  }

  try {
    // Hopefully we never get here...
    // Not all environments allow eval and Function. Use only as a last resort:
    // eslint-disable-next-line no-new-func
    return new Function("return this")();
  } catch (_a) {
    // If all fails, give up and create an object.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {};
  }
}(); // API-only Polyfill for trustedTypes

if ($global.trustedTypes === void 0) {
  $global.trustedTypes = {
    createPolicy: (n, r) => r
  };
}
/**
 * A readonly, empty array.
 * @remarks
 * Typically returned by APIs that return arrays when there are
 * no actual items to return.
 * @internal
 */


const emptyArray = Object.freeze([]);

const updateQueue = [];
/* eslint-disable */

const fastHTMLPolicy = $global.trustedTypes.createPolicy("fast-html", {
  createHTML: html => html
});
/* eslint-enable */

let htmlPolicy = fastHTMLPolicy; // We use a queue so we can ensure errors are thrown in order.

const pendingErrors = [];

function throwFirstError() {
  if (pendingErrors.length) {
    throw pendingErrors.shift();
  }
}

function tryRunTask(task) {
  try {
    task.call();
  } catch (error) {
    pendingErrors.push(error);
    setTimeout(throwFirstError, 0);
  }
}

const marker = `fast-${Math.random().toString(36).substring(2, 8)}`;
/** @internal */

const _interpolationStart = `${marker}{`;
/** @internal */

const _interpolationEnd = `}${marker}`;
/**
 * Common DOM APIs.
 * @public
 */

const DOM = Object.freeze({
  /**
   * Indicates whether the DOM supports the adoptedStyleSheets feature.
   */
  supportsAdoptedStyleSheets: Array.isArray(document.adoptedStyleSheets) && "replace" in CSSStyleSheet.prototype,

  /**
   * Sets the HTML trusted types policy used by the templating engine.
   * @param policy - The policy to set for HTML.
   * @remarks
   * This API can only be called once, for security reasons. It should be
   * called by the application developer at the start of their program.
   */
  setHTMLPolicy(policy) {
    if (htmlPolicy !== fastHTMLPolicy) {
      throw new Error("The HTML policy can only be set once.");
    }

    htmlPolicy = policy;
  },

  /**
   * Turns a string into trusted HTML using the configured trusted types policy.
   * @param html - The string to turn into trusted HTML.
   * @remarks
   * Used internally by the template engine when creating templates
   * and setting innerHTML.
   */
  createHTML(html) {
    return htmlPolicy.createHTML(html);
  },

  /**
   * Determines if the provided node is a template marker used by the runtime.
   * @param node - The node to test.
   */
  isMarker(node) {
    return node && node.nodeType === 8 && node.data.startsWith(marker);
  },

  /**
   * Given a marker node, extract the {@link HTMLDirective} index from the placeholder.
   * @param node - The marker node to extract the index from.
   */
  extractDirectiveIndexFromMarker(node) {
    return parseInt(node.data.replace(`${marker}:`, ""));
  },

  /**
   * Creates a placeholder string suitable for marking out a location *within*
   * an attribute value or HTML content.
   * @param index - The directive index to create the placeholder for.
   * @remarks
   * Used internally by binding directives.
   */
  createInterpolationPlaceholder(index) {
    return `${_interpolationStart}${index}${_interpolationEnd}`;
  },

  /**
   * Creates a placeholder that manifests itself as an attribute on an
   * element.
   * @param attributeName - The name of the custom attribute.
   * @param index - The directive index to create the placeholder for.
   * @remarks
   * Used internally by attribute directives such as `ref`, `slotted`, and `children`.
   */
  createCustomAttributePlaceholder(attributeName, index) {
    return `${attributeName}="${this.createInterpolationPlaceholder(index)}"`;
  },

  /**
   * Creates a placeholder that manifests itself as a marker within the DOM structure.
   * @param index - The directive index to create the placeholder for.
   * @remarks
   * Used internally by structural directives such as `repeat`.
   */
  createBlockPlaceholder(index) {
    return `<!--${marker}:${index}-->`;
  },

  /**
   * Schedules DOM update work in the next async batch.
   * @param callable - The callable function or object to queue.
   */
  queueUpdate(callable) {
    if (updateQueue.length < 1) {
      window.requestAnimationFrame(DOM.processUpdates);
    }

    updateQueue.push(callable);
  },

  /**
   * Immediately processes all work previously scheduled
   * through queueUpdate.
   * @remarks
   * This also forces nextUpdate promises
   * to resolve.
   */
  processUpdates() {
    const capacity = 1024;
    let index = 0;

    while (index < updateQueue.length) {
      tryRunTask(updateQueue[index]);
      index++; // Prevent leaking memory for long chains of recursive calls to `DOM.queueUpdate`.
      // If we call `DOM.queueUpdate` within a task scheduled by `DOM.queueUpdate`, the queue will
      // grow, but to avoid an O(n) walk for every task we execute, we don't
      // shift tasks off the queue after they have been executed.
      // Instead, we periodically shift 1024 tasks off the queue.

      if (index > capacity) {
        // Manually shift all values starting at the index back to the
        // beginning of the queue.
        for (let scan = 0, newLength = updateQueue.length - index; scan < newLength; scan++) {
          updateQueue[scan] = updateQueue[scan + index];
        }

        updateQueue.length -= index;
        index = 0;
      }
    }

    updateQueue.length = 0;
  },

  /**
   * Resolves with the next DOM update.
   */
  nextUpdate() {
    return new Promise(resolve => {
      DOM.queueUpdate(resolve);
    });
  },

  /**
   * Sets an attribute value on an element.
   * @param element - The element to set the attribute value on.
   * @param attributeName - The attribute name to set.
   * @param value - The value of the attribute to set.
   * @remarks
   * If the value is `null` or `undefined`, the attribute is removed, otherwise
   * it is set to the provided value using the standard `setAttribute` API.
   */
  setAttribute(element, attributeName, value) {
    if (value === null || value === undefined) {
      element.removeAttribute(attributeName);
    } else {
      element.setAttribute(attributeName, value);
    }
  },

  /**
   * Sets a boolean attribute value.
   * @param element - The element to set the boolean attribute value on.
   * @param attributeName - The attribute name to set.
   * @param value - The value of the attribute to set.
   * @remarks
   * If the value is true, the attribute is added; otherwise it is removed.
   */
  setBooleanAttribute(element, attributeName, value) {
    value ? element.setAttribute(attributeName, "") : element.removeAttribute(attributeName);
  },

  /**
   * Removes all the child nodes of the provided parent node.
   * @param parent - The node to remove the children from.
   */
  removeChildNodes(parent) {
    for (let child = parent.firstChild; child !== null; child = parent.firstChild) {
      parent.removeChild(child);
    }
  },

  /**
   * Creates a TreeWalker configured to walk a template fragment.
   * @param fragment - The fragment to walk.
   */
  createTemplateWalker(fragment) {
    return document.createTreeWalker(fragment, 133, // element, text, comment
    null, false);
  }

});

function spilloverSubscribe(subscriber) {
  const spillover = this.spillover;
  const index = spillover.indexOf(subscriber);

  if (index === -1) {
    spillover.push(subscriber);
  }
}

function spilloverUnsubscribe(subscriber) {
  const spillover = this.spillover;
  const index = spillover.indexOf(subscriber);

  if (index !== -1) {
    spillover.splice(index, 1);
  }
}

function spilloverNotifySubscribers(args) {
  const spillover = this.spillover;
  const source = this.source;

  for (let i = 0, ii = spillover.length; i < ii; ++i) {
    spillover[i].handleChange(source, args);
  }
}

function spilloverHas(subscriber) {
  return this.spillover.indexOf(subscriber) !== -1;
}
/**
 * An implementation of {@link Notifier} that efficiently keeps track of
 * subscribers interested in a specific change notification on an
 * observable source.
 *
 * @remarks
 * This set is optimized for the most common scenario of 1 or 2 subscribers.
 * With this in mind, it can store a subscriber in an internal field, allowing it to avoid Array#push operations.
 * If the set ever exceeds two subscribers, it upgrades to an array automatically.
 * @public
 */


class SubscriberSet {
  /**
   * Creates an instance of SubscriberSet for the specified source.
   * @param source - The object source that subscribers will receive notifications from.
   * @param initialSubscriber - An initial subscriber to changes.
   */
  constructor(source, initialSubscriber) {
    this.sub1 = void 0;
    this.sub2 = void 0;
    this.spillover = void 0;
    this.source = source;
    this.sub1 = initialSubscriber;
  }
  /**
   * Checks whether the provided subscriber has been added to this set.
   * @param subscriber - The subscriber to test for inclusion in this set.
   */


  has(subscriber) {
    return this.sub1 === subscriber || this.sub2 === subscriber;
  }
  /**
   * Subscribes to notification of changes in an object's state.
   * @param subscriber - The object that is subscribing for change notification.
   */


  subscribe(subscriber) {
    if (this.has(subscriber)) {
      return;
    }

    if (this.sub1 === void 0) {
      this.sub1 = subscriber;
      return;
    }

    if (this.sub2 === void 0) {
      this.sub2 = subscriber;
      return;
    }

    this.spillover = [this.sub1, this.sub2, subscriber];
    this.subscribe = spilloverSubscribe;
    this.unsubscribe = spilloverUnsubscribe;
    this.notify = spilloverNotifySubscribers;
    this.has = spilloverHas;
    this.sub1 = void 0;
    this.sub2 = void 0;
  }
  /**
   * Unsubscribes from notification of changes in an object's state.
   * @param subscriber - The object that is unsubscribing from change notification.
   */


  unsubscribe(subscriber) {
    if (this.sub1 === subscriber) {
      this.sub1 = void 0;
    } else if (this.sub2 === subscriber) {
      this.sub2 = void 0;
    }
  }
  /**
   * Notifies all subscribers.
   * @param args - Data passed along to subscribers during notification.
   */


  notify(args) {
    const sub1 = this.sub1;
    const sub2 = this.sub2;
    const source = this.source;

    if (sub1 !== void 0) {
      sub1.handleChange(source, args);
    }

    if (sub2 !== void 0) {
      sub2.handleChange(source, args);
    }
  }

}
/**
 * An implementation of Notifier that allows subscribers to be notified
 * of individual property changes on an object.
 * @public
 */

class PropertyChangeNotifier {
  /**
   * Creates an instance of PropertyChangeNotifier for the specified source.
   * @param source - The object source that subscribers will receive notifications from.
   */
  constructor(source) {
    this.subscribers = {};
    this.sourceSubscribers = null;
    this.source = source;
  }
  /**
   * Notifies all subscribers, based on the specified property.
   * @param propertyName - The property name, passed along to subscribers during notification.
   */


  notify(propertyName) {
    var _a;

    const subscribers = this.subscribers[propertyName];

    if (subscribers !== void 0) {
      subscribers.notify(propertyName);
    }

    (_a = this.sourceSubscribers) === null || _a === void 0 ? void 0 : _a.notify(propertyName);
  }
  /**
   * Subscribes to notification of changes in an object's state.
   * @param subscriber - The object that is subscribing for change notification.
   * @param propertyToWatch - The name of the property that the subscriber is interested in watching for changes.
   */


  subscribe(subscriber, propertyToWatch) {
    var _a;

    if (propertyToWatch) {
      let subscribers = this.subscribers[propertyToWatch];

      if (subscribers === void 0) {
        this.subscribers[propertyToWatch] = subscribers = new SubscriberSet(this.source);
      }

      subscribers.subscribe(subscriber);
    } else {
      this.sourceSubscribers = (_a = this.sourceSubscribers) !== null && _a !== void 0 ? _a : new SubscriberSet(this.source);
      this.sourceSubscribers.subscribe(subscriber);
    }
  }
  /**
   * Unsubscribes from notification of changes in an object's state.
   * @param subscriber - The object that is unsubscribing from change notification.
   * @param propertyToUnwatch - The name of the property that the subscriber is no longer interested in watching.
   */


  unsubscribe(subscriber, propertyToUnwatch) {
    var _a;

    if (propertyToUnwatch) {
      const subscribers = this.subscribers[propertyToUnwatch];

      if (subscribers !== void 0) {
        subscribers.unsubscribe(subscriber);
      }
    } else {
      (_a = this.sourceSubscribers) === null || _a === void 0 ? void 0 : _a.unsubscribe(subscriber);
    }
  }

}

const volatileRegex = /(:|&&|\|\||if)/;
const notifierLookup = new WeakMap();
const accessorLookup = new WeakMap();
let watcher = void 0;

let createArrayObserver = array => {
  throw new Error("Must call enableArrayObservation before observing arrays.");
};

class DefaultObservableAccessor {
  constructor(name) {
    this.name = name;
    this.field = `_${name}`;
    this.callback = `${name}Changed`;
  }

  getValue(source) {
    if (watcher !== void 0) {
      watcher.watch(source, this.name);
    }

    return source[this.field];
  }

  setValue(source, newValue) {
    const field = this.field;
    const oldValue = source[field];

    if (oldValue !== newValue) {
      source[field] = newValue;
      const callback = source[this.callback];

      if (typeof callback === "function") {
        callback.call(source, oldValue, newValue);
      }
      /* eslint-disable-next-line @typescript-eslint/no-use-before-define */


      getNotifier(source).notify(this.name);
    }
  }

}
/**
 * Common Observable APIs.
 * @public
 */


const Observable = Object.freeze({
  /**
   * @internal
   * @param factory - The factory used to create array observers.
   */
  setArrayObserverFactory(factory) {
    createArrayObserver = factory;
  },

  /**
   * Gets a notifier for an object or Array.
   * @param source - The object or Array to get the notifier for.
   */
  getNotifier(source) {
    let found = source.$fastController || notifierLookup.get(source);

    if (found === void 0) {
      if (Array.isArray(source)) {
        found = createArrayObserver(source);
      } else {
        notifierLookup.set(source, found = new PropertyChangeNotifier(source));
      }
    }

    return found;
  },

  /**
   * Records a property change for a source object.
   * @param source - The object to record the change against.
   * @param propertyName - The property to track as changed.
   */
  track(source, propertyName) {
    if (watcher !== void 0) {
      watcher.watch(source, propertyName);
    }
  },

  /**
   * Notifies watchers that the currently executing property getter or function is volatile
   * with respect to its observable dependencies.
   */
  trackVolatile() {
    if (watcher !== void 0) {
      watcher.needsRefresh = true;
    }
  },

  /**
   * Notifies subscribers of a source object of changes.
   * @param source - the object to notify of changes.
   * @param args - The change args to pass to subscribers.
   */
  notify(source, args) {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
    getNotifier(source).notify(args);
  },

  /**
   * Defines an observable property on an object or prototype.
   * @param target - The target object to define the observable on.
   * @param nameOrAccessor - The name of the property to define as observable;
   * or a custom accessor that specifies the property name and accessor implementation.
   */
  defineProperty(target, nameOrAccessor) {
    if (typeof nameOrAccessor === "string") {
      nameOrAccessor = new DefaultObservableAccessor(nameOrAccessor);
    }

    this.getAccessors(target).push(nameOrAccessor);
    Reflect.defineProperty(target, nameOrAccessor.name, {
      enumerable: true,
      get: function () {
        return nameOrAccessor.getValue(this);
      },
      set: function (newValue) {
        nameOrAccessor.setValue(this, newValue);
      }
    });
  },

  /**
   * Finds all the observable accessors defined on the target,
   * including its prototype chain.
   * @param target - The target object to search for accessor on.
   */
  getAccessors(target) {
    let accessors = accessorLookup.get(target);

    if (accessors === void 0) {
      let currentTarget = Reflect.getPrototypeOf(target);

      while (accessors === void 0 && currentTarget !== null) {
        accessors = accessorLookup.get(currentTarget);
        currentTarget = Reflect.getPrototypeOf(currentTarget);
      }

      if (accessors === void 0) {
        accessors = [];
      } else {
        accessors = accessors.slice(0);
      }

      accessorLookup.set(target, accessors);
    }

    return accessors;
  },

  /**
   * Creates a {@link BindingObserver} that can watch the
   * provided {@link Binding} for changes.
   * @param binding - The binding to observe.
   * @param initialSubscriber - An initial subscriber to changes in the binding value.
   * @param isVolatileBinding - Indicates whether the binding's dependency list must be re-evaluated on every value evaluation.
   */
  binding(binding, initialSubscriber, isVolatileBinding = this.isVolatileBinding(binding)) {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
    return new BindingObserverImplementation(binding, initialSubscriber, isVolatileBinding);
  },

  /**
   * Determines whether a binding expression is volatile and needs to have its dependency list re-evaluated
   * on every evaluation of the value.
   * @param binding - The binding to inspect.
   */
  isVolatileBinding(binding) {
    return volatileRegex.test(binding.toString());
  }

});
const getNotifier = Observable.getNotifier;
Observable.trackVolatile;
const queueUpdate = DOM.queueUpdate;
/**
 * Decorator: Defines an observable property on the target.
 * @param target - The target to define the observable on.
 * @param nameOrAccessor - The property name or accessor to define the observable as.
 * @public
 */

function observable(target, nameOrAccessor) {
  Observable.defineProperty(target, nameOrAccessor);
}
let currentEvent = null;
/**
 * @param event - The event to set as current for the context.
 * @internal
 */

function setCurrentEvent(event) {
  currentEvent = event;
}
/**
 * Provides additional contextual information available to behaviors and expressions.
 * @public
 */

class ExecutionContext {
  constructor() {
    /**
     * The index of the current item within a repeat context.
     */
    this.index = 0;
    /**
     * The length of the current collection within a repeat context.
     */

    this.length = 0;
    /**
     * The parent data object within a repeat context.
     */

    this.parent = null;
    /**
     * The parent execution context when in nested context scenarios.
     */

    this.parentContext = null;
  }
  /**
   * The current event within an event handler.
   */


  get event() {
    return currentEvent;
  }
  /**
   * Indicates whether the current item within a repeat context
   * has an even index.
   */


  get isEven() {
    return this.index % 2 === 0;
  }
  /**
   * Indicates whether the current item within a repeat context
   * has an odd index.
   */


  get isOdd() {
    return this.index % 2 !== 0;
  }
  /**
   * Indicates whether the current item within a repeat context
   * is the first item in the collection.
   */


  get isFirst() {
    return this.index === 0;
  }
  /**
   * Indicates whether the current item within a repeat context
   * is somewhere in the middle of the collection.
   */


  get isInMiddle() {
    return !this.isFirst && !this.isLast;
  }
  /**
   * Indicates whether the current item within a repeat context
   * is the last item in the collection.
   */


  get isLast() {
    return this.index === this.length - 1;
  }

}
Observable.defineProperty(ExecutionContext.prototype, "index");
Observable.defineProperty(ExecutionContext.prototype, "length");
/**
 * The default execution context used in binding expressions.
 * @public
 */

const defaultExecutionContext = Object.seal(new ExecutionContext());

class BindingObserverImplementation extends SubscriberSet {
  constructor(binding, initialSubscriber, isVolatileBinding = false) {
    super(binding, initialSubscriber);
    this.binding = binding;
    this.isVolatileBinding = isVolatileBinding;
    this.needsRefresh = true;
    this.needsQueue = true;
    this.first = this;
    this.last = null;
    this.propertySource = void 0;
    this.propertyName = void 0;
    this.notifier = void 0;
    this.next = void 0;
  }

  observe(source, context) {
    if (this.needsRefresh && this.last !== null) {
      this.disconnect();
    }

    const previousWatcher = watcher;
    watcher = this.needsRefresh ? this : void 0;
    this.needsRefresh = this.isVolatileBinding;
    const result = this.binding(source, context);
    watcher = previousWatcher;
    return result;
  }

  disconnect() {
    if (this.last !== null) {
      let current = this.first;

      while (current !== void 0) {
        current.notifier.unsubscribe(this, current.propertyName);
        current = current.next;
      }

      this.last = null;
      this.needsRefresh = this.needsQueue = true;
    }
  }
  /** @internal */


  watch(propertySource, propertyName) {
    const prev = this.last;
    const notifier = getNotifier(propertySource);
    const current = prev === null ? this.first : {};
    current.propertySource = propertySource;
    current.propertyName = propertyName;
    current.notifier = notifier;
    notifier.subscribe(this, propertyName);

    if (prev !== null) {
      if (!this.needsRefresh) {
        // Declaring the variable prior to assignment below circumvents
        // a bug in Angular's optimization process causing infinite recursion
        // of this watch() method. Details https://github.com/microsoft/fast/issues/4969
        let prevValue;
        watcher = void 0;
        /* eslint-disable-next-line */

        prevValue = prev.propertySource[prev.propertyName];
        watcher = this;

        if (propertySource === prevValue) {
          this.needsRefresh = true;
        }
      }

      prev.next = current;
    }

    this.last = current;
  }
  /** @internal */


  handleChange() {
    if (this.needsQueue) {
      this.needsQueue = false;
      queueUpdate(this);
    }
  }
  /** @internal */


  call() {
    if (this.last !== null) {
      this.needsQueue = true;
      this.notify(this);
    }
  }

  records() {
    let next = this.first;
    return {
      next: () => {
        const current = next;

        if (current === undefined) {
          return {
            value: void 0,
            done: true
          };
        } else {
          next = next.next;
          return {
            value: current,
            done: false
          };
        }
      },
      [Symbol.iterator]: function () {
        return this;
      }
    };
  }

}

/**
 * Instructs the template engine to apply behavior to a node.
 * @public
 */

class HTMLDirective {
  constructor() {
    /**
     * The index of the DOM node to which the created behavior will apply.
     */
    this.targetIndex = 0;
  }

}
/**
 * A {@link HTMLDirective} that targets a named attribute or property on a node.
 * @public
 */

class TargetedHTMLDirective extends HTMLDirective {
  constructor() {
    super(...arguments);
    /**
     * Creates a placeholder string based on the directive's index within the template.
     * @param index - The index of the directive within the template.
     */

    this.createPlaceholder = DOM.createInterpolationPlaceholder;
  }

}
/**
 * A directive that attaches special behavior to an element via a custom attribute.
 * @public
 */

class AttachedBehaviorHTMLDirective extends HTMLDirective {
  /**
   *
   * @param name - The name of the behavior; used as a custom attribute on the element.
   * @param behavior - The behavior to instantiate and attach to the element.
   * @param options - Options to pass to the behavior during creation.
   */
  constructor(name, behavior, options) {
    super();
    this.name = name;
    this.behavior = behavior;
    this.options = options;
  }
  /**
   * Creates a placeholder string based on the directive's index within the template.
   * @param index - The index of the directive within the template.
   * @remarks
   * Creates a custom attribute placeholder.
   */


  createPlaceholder(index) {
    return DOM.createCustomAttributePlaceholder(this.name, index);
  }
  /**
   * Creates a behavior for the provided target node.
   * @param target - The node instance to create the behavior for.
   * @remarks
   * Creates an instance of the `behavior` type this directive was constructed with
   * and passes the target and options to that `behavior`'s constructor.
   */


  createBehavior(target) {
    return new this.behavior(target, this.options);
  }

}

function normalBind(source, context) {
  this.source = source;
  this.context = context;

  if (this.bindingObserver === null) {
    this.bindingObserver = Observable.binding(this.binding, this, this.isBindingVolatile);
  }

  this.updateTarget(this.bindingObserver.observe(source, context));
}

function triggerBind(source, context) {
  this.source = source;
  this.context = context;
  this.target.addEventListener(this.targetName, this);
}

function normalUnbind() {
  this.bindingObserver.disconnect();
  this.source = null;
  this.context = null;
}

function contentUnbind() {
  this.bindingObserver.disconnect();
  this.source = null;
  this.context = null;
  const view = this.target.$fastView;

  if (view !== void 0 && view.isComposed) {
    view.unbind();
    view.needsBindOnly = true;
  }
}

function triggerUnbind() {
  this.target.removeEventListener(this.targetName, this);
  this.source = null;
  this.context = null;
}

function updateAttributeTarget(value) {
  DOM.setAttribute(this.target, this.targetName, value);
}

function updateBooleanAttributeTarget(value) {
  DOM.setBooleanAttribute(this.target, this.targetName, value);
}

function updateContentTarget(value) {
  // If there's no actual value, then this equates to the
  // empty string for the purposes of content bindings.
  if (value === null || value === undefined) {
    value = "";
  } // If the value has a "create" method, then it's a template-like.


  if (value.create) {
    this.target.textContent = "";
    let view = this.target.$fastView; // If there's no previous view that we might be able to
    // reuse then create a new view from the template.

    if (view === void 0) {
      view = value.create();
    } else {
      // If there is a previous view, but it wasn't created
      // from the same template as the new value, then we
      // need to remove the old view if it's still in the DOM
      // and create a new view from the template.
      if (this.target.$fastTemplate !== value) {
        if (view.isComposed) {
          view.remove();
          view.unbind();
        }

        view = value.create();
      }
    } // It's possible that the value is the same as the previous template
    // and that there's actually no need to compose it.


    if (!view.isComposed) {
      view.isComposed = true;
      view.bind(this.source, this.context);
      view.insertBefore(this.target);
      this.target.$fastView = view;
      this.target.$fastTemplate = value;
    } else if (view.needsBindOnly) {
      view.needsBindOnly = false;
      view.bind(this.source, this.context);
    }
  } else {
    const view = this.target.$fastView; // If there is a view and it's currently composed into
    // the DOM, then we need to remove it.

    if (view !== void 0 && view.isComposed) {
      view.isComposed = false;
      view.remove();

      if (view.needsBindOnly) {
        view.needsBindOnly = false;
      } else {
        view.unbind();
      }
    }

    this.target.textContent = value;
  }
}

function updatePropertyTarget(value) {
  this.target[this.targetName] = value;
}

function updateClassTarget(value) {
  const classVersions = this.classVersions || Object.create(null);
  const target = this.target;
  let version = this.version || 0; // Add the classes, tracking the version at which they were added.

  if (value !== null && value !== undefined && value.length) {
    const names = value.split(/\s+/);

    for (let i = 0, ii = names.length; i < ii; ++i) {
      const currentName = names[i];

      if (currentName === "") {
        continue;
      }

      classVersions[currentName] = version;
      target.classList.add(currentName);
    }
  }

  this.classVersions = classVersions;
  this.version = version + 1; // If this is the first call to add classes, there's no need to remove old ones.

  if (version === 0) {
    return;
  } // Remove classes from the previous version.


  version -= 1;

  for (const name in classVersions) {
    if (classVersions[name] === version) {
      target.classList.remove(name);
    }
  }
}
/**
 * A directive that configures data binding to element content and attributes.
 * @public
 */


class HTMLBindingDirective extends TargetedHTMLDirective {
  /**
   * Creates an instance of BindingDirective.
   * @param binding - A binding that returns the data used to update the DOM.
   */
  constructor(binding) {
    super();
    this.binding = binding;
    this.bind = normalBind;
    this.unbind = normalUnbind;
    this.updateTarget = updateAttributeTarget;
    this.isBindingVolatile = Observable.isVolatileBinding(this.binding);
  }
  /**
   * Gets/sets the name of the attribute or property that this
   * binding is targeting.
   */


  get targetName() {
    return this.originalTargetName;
  }

  set targetName(value) {
    this.originalTargetName = value;

    if (value === void 0) {
      return;
    }

    switch (value[0]) {
      case ":":
        this.cleanedTargetName = value.substr(1);
        this.updateTarget = updatePropertyTarget;

        if (this.cleanedTargetName === "innerHTML") {
          const binding = this.binding;

          this.binding = (s, c) => DOM.createHTML(binding(s, c));
        }

        break;

      case "?":
        this.cleanedTargetName = value.substr(1);
        this.updateTarget = updateBooleanAttributeTarget;
        break;

      case "@":
        this.cleanedTargetName = value.substr(1);
        this.bind = triggerBind;
        this.unbind = triggerUnbind;
        break;

      default:
        this.cleanedTargetName = value;

        if (value === "class") {
          this.updateTarget = updateClassTarget;
        }

        break;
    }
  }
  /**
   * Makes this binding target the content of an element rather than
   * a particular attribute or property.
   */


  targetAtContent() {
    this.updateTarget = updateContentTarget;
    this.unbind = contentUnbind;
  }
  /**
   * Creates the runtime BindingBehavior instance based on the configuration
   * information stored in the BindingDirective.
   * @param target - The target node that the binding behavior should attach to.
   */


  createBehavior(target) {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
    return new BindingBehavior(target, this.binding, this.isBindingVolatile, this.bind, this.unbind, this.updateTarget, this.cleanedTargetName);
  }

}
/**
 * A behavior that updates content and attributes based on a configured
 * BindingDirective.
 * @public
 */

class BindingBehavior {
  /**
   * Creates an instance of BindingBehavior.
   * @param target - The target of the data updates.
   * @param binding - The binding that returns the latest value for an update.
   * @param isBindingVolatile - Indicates whether the binding has volatile dependencies.
   * @param bind - The operation to perform during binding.
   * @param unbind - The operation to perform during unbinding.
   * @param updateTarget - The operation to perform when updating.
   * @param targetName - The name of the target attribute or property to update.
   */
  constructor(target, binding, isBindingVolatile, bind, unbind, updateTarget, targetName) {
    /** @internal */
    this.source = null;
    /** @internal */

    this.context = null;
    /** @internal */

    this.bindingObserver = null;
    this.target = target;
    this.binding = binding;
    this.isBindingVolatile = isBindingVolatile;
    this.bind = bind;
    this.unbind = unbind;
    this.updateTarget = updateTarget;
    this.targetName = targetName;
  }
  /** @internal */


  handleChange() {
    this.updateTarget(this.bindingObserver.observe(this.source, this.context));
  }
  /** @internal */


  handleEvent(event) {
    setCurrentEvent(event);
    const result = this.binding(this.source, this.context);
    setCurrentEvent(null);

    if (result !== true) {
      event.preventDefault();
    }
  }

}

let sharedContext = null;

class CompilationContext {
  addFactory(factory) {
    factory.targetIndex = this.targetIndex;
    this.behaviorFactories.push(factory);
  }

  captureContentBinding(directive) {
    directive.targetAtContent();
    this.addFactory(directive);
  }

  reset() {
    this.behaviorFactories = [];
    this.targetIndex = -1;
  }

  release() {
    sharedContext = this;
  }

  static borrow(directives) {
    const shareable = sharedContext || new CompilationContext();
    shareable.directives = directives;
    shareable.reset();
    sharedContext = null;
    return shareable;
  }

}

function createAggregateBinding(parts) {
  if (parts.length === 1) {
    return parts[0];
  }

  let targetName;
  const partCount = parts.length;
  const finalParts = parts.map(x => {
    if (typeof x === "string") {
      return () => x;
    }

    targetName = x.targetName || targetName;
    return x.binding;
  });

  const binding = (scope, context) => {
    let output = "";

    for (let i = 0; i < partCount; ++i) {
      output += finalParts[i](scope, context);
    }

    return output;
  };

  const directive = new HTMLBindingDirective(binding);
  directive.targetName = targetName;
  return directive;
}

const interpolationEndLength = _interpolationEnd.length;

function parseContent(context, value) {
  const valueParts = value.split(_interpolationStart);

  if (valueParts.length === 1) {
    return null;
  }

  const bindingParts = [];

  for (let i = 0, ii = valueParts.length; i < ii; ++i) {
    const current = valueParts[i];
    const index = current.indexOf(_interpolationEnd);
    let literal;

    if (index === -1) {
      literal = current;
    } else {
      const directiveIndex = parseInt(current.substring(0, index));
      bindingParts.push(context.directives[directiveIndex]);
      literal = current.substring(index + interpolationEndLength);
    }

    if (literal !== "") {
      bindingParts.push(literal);
    }
  }

  return bindingParts;
}

function compileAttributes(context, node, includeBasicValues = false) {
  const attributes = node.attributes;

  for (let i = 0, ii = attributes.length; i < ii; ++i) {
    const attr = attributes[i];
    const attrValue = attr.value;
    const parseResult = parseContent(context, attrValue);
    let result = null;

    if (parseResult === null) {
      if (includeBasicValues) {
        result = new HTMLBindingDirective(() => attrValue);
        result.targetName = attr.name;
      }
    } else {
      result = createAggregateBinding(parseResult);
    }

    if (result !== null) {
      node.removeAttributeNode(attr);
      i--;
      ii--;
      context.addFactory(result);
    }
  }
}

function compileContent(context, node, walker) {
  const parseResult = parseContent(context, node.textContent);

  if (parseResult !== null) {
    let lastNode = node;

    for (let i = 0, ii = parseResult.length; i < ii; ++i) {
      const currentPart = parseResult[i];
      const currentNode = i === 0 ? node : lastNode.parentNode.insertBefore(document.createTextNode(""), lastNode.nextSibling);

      if (typeof currentPart === "string") {
        currentNode.textContent = currentPart;
      } else {
        currentNode.textContent = " ";
        context.captureContentBinding(currentPart);
      }

      lastNode = currentNode;
      context.targetIndex++;

      if (currentNode !== node) {
        walker.nextNode();
      }
    }

    context.targetIndex--;
  }
}
/**
 * Compiles a template and associated directives into a raw compilation
 * result which include a cloneable DocumentFragment and factories capable
 * of attaching runtime behavior to nodes within the fragment.
 * @param template - The template to compile.
 * @param directives - The directives referenced by the template.
 * @remarks
 * The template that is provided for compilation is altered in-place
 * and cannot be compiled again. If the original template must be preserved,
 * it is recommended that you clone the original and pass the clone to this API.
 * @public
 */


function compileTemplate(template, directives) {
  const fragment = template.content; // https://bugs.chromium.org/p/chromium/issues/detail?id=1111864

  document.adoptNode(fragment);
  const context = CompilationContext.borrow(directives);
  compileAttributes(context, template, true);
  const hostBehaviorFactories = context.behaviorFactories;
  context.reset();
  const walker = DOM.createTemplateWalker(fragment);
  let node;

  while (node = walker.nextNode()) {
    context.targetIndex++;

    switch (node.nodeType) {
      case 1:
        // element node
        compileAttributes(context, node);
        break;

      case 3:
        // text node
        compileContent(context, node, walker);
        break;

      case 8:
        // comment
        if (DOM.isMarker(node)) {
          context.addFactory(directives[DOM.extractDirectiveIndexFromMarker(node)]);
        }

    }
  }

  let targetOffset = 0;

  if ( // If the first node in a fragment is a marker, that means it's an unstable first node,
  // because something like a when, repeat, etc. could add nodes before the marker.
  // To mitigate this, we insert a stable first node. However, if we insert a node,
  // that will alter the result of the TreeWalker. So, we also need to offset the target index.
  DOM.isMarker(fragment.firstChild) || // Or if there is only one node and a directive, it means the template's content
  // is *only* the directive. In that case, HTMLView.dispose() misses any nodes inserted by
  // the directive. Inserting a new node ensures proper disposal of nodes added by the directive.
  fragment.childNodes.length === 1 && directives.length) {
    fragment.insertBefore(document.createComment(""), fragment.firstChild);
    targetOffset = -1;
  }

  const viewBehaviorFactories = context.behaviorFactories;
  context.release();
  return {
    fragment,
    viewBehaviorFactories,
    hostBehaviorFactories,
    targetOffset
  };
}

// A singleton Range instance used to efficiently remove ranges of DOM nodes.
// See the implementation of HTMLView below for further details.
const range = document.createRange();
/**
 * The standard View implementation, which also implements ElementView and SyntheticView.
 * @public
 */

class HTMLView {
  /**
   * Constructs an instance of HTMLView.
   * @param fragment - The html fragment that contains the nodes for this view.
   * @param behaviors - The behaviors to be applied to this view.
   */
  constructor(fragment, behaviors) {
    this.fragment = fragment;
    this.behaviors = behaviors;
    /**
     * The data that the view is bound to.
     */

    this.source = null;
    /**
     * The execution context the view is running within.
     */

    this.context = null;
    this.firstChild = fragment.firstChild;
    this.lastChild = fragment.lastChild;
  }
  /**
   * Appends the view's DOM nodes to the referenced node.
   * @param node - The parent node to append the view's DOM nodes to.
   */


  appendTo(node) {
    node.appendChild(this.fragment);
  }
  /**
   * Inserts the view's DOM nodes before the referenced node.
   * @param node - The node to insert the view's DOM before.
   */


  insertBefore(node) {
    if (this.fragment.hasChildNodes()) {
      node.parentNode.insertBefore(this.fragment, node);
    } else {
      const parentNode = node.parentNode;
      const end = this.lastChild;
      let current = this.firstChild;
      let next;

      while (current !== end) {
        next = current.nextSibling;
        parentNode.insertBefore(current, node);
        current = next;
      }

      parentNode.insertBefore(end, node);
    }
  }
  /**
   * Removes the view's DOM nodes.
   * The nodes are not disposed and the view can later be re-inserted.
   */


  remove() {
    const fragment = this.fragment;
    const end = this.lastChild;
    let current = this.firstChild;
    let next;

    while (current !== end) {
      next = current.nextSibling;
      fragment.appendChild(current);
      current = next;
    }

    fragment.appendChild(end);
  }
  /**
   * Removes the view and unbinds its behaviors, disposing of DOM nodes afterward.
   * Once a view has been disposed, it cannot be inserted or bound again.
   */


  dispose() {
    const parent = this.firstChild.parentNode;
    const end = this.lastChild;
    let current = this.firstChild;
    let next;

    while (current !== end) {
      next = current.nextSibling;
      parent.removeChild(current);
      current = next;
    }

    parent.removeChild(end);
    const behaviors = this.behaviors;
    const oldSource = this.source;

    for (let i = 0, ii = behaviors.length; i < ii; ++i) {
      behaviors[i].unbind(oldSource);
    }
  }
  /**
   * Binds a view's behaviors to its binding source.
   * @param source - The binding source for the view's binding behaviors.
   * @param context - The execution context to run the behaviors within.
   */


  bind(source, context) {
    const behaviors = this.behaviors;

    if (this.source === source) {
      return;
    } else if (this.source !== null) {
      const oldSource = this.source;
      this.source = source;
      this.context = context;

      for (let i = 0, ii = behaviors.length; i < ii; ++i) {
        const current = behaviors[i];
        current.unbind(oldSource);
        current.bind(source, context);
      }
    } else {
      this.source = source;
      this.context = context;

      for (let i = 0, ii = behaviors.length; i < ii; ++i) {
        behaviors[i].bind(source, context);
      }
    }
  }
  /**
   * Unbinds a view's behaviors from its binding source.
   */


  unbind() {
    if (this.source === null) {
      return;
    }

    const behaviors = this.behaviors;
    const oldSource = this.source;

    for (let i = 0, ii = behaviors.length; i < ii; ++i) {
      behaviors[i].unbind(oldSource);
    }

    this.source = null;
  }
  /**
   * Efficiently disposes of a contiguous range of synthetic view instances.
   * @param views - A contiguous range of views to be disposed.
   */


  static disposeContiguousBatch(views) {
    if (views.length === 0) {
      return;
    }

    range.setStartBefore(views[0].firstChild);
    range.setEndAfter(views[views.length - 1].lastChild);
    range.deleteContents();

    for (let i = 0, ii = views.length; i < ii; ++i) {
      const view = views[i];
      const behaviors = view.behaviors;
      const oldSource = view.source;

      for (let j = 0, jj = behaviors.length; j < jj; ++j) {
        behaviors[j].unbind(oldSource);
      }
    }
  }

}

/**
 * A template capable of creating HTMLView instances or rendering directly to DOM.
 * @public
 */

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */

class ViewTemplate {
  /**
   * Creates an instance of ViewTemplate.
   * @param html - The html representing what this template will instantiate, including placeholders for directives.
   * @param directives - The directives that will be connected to placeholders in the html.
   */
  constructor(html, directives) {
    this.behaviorCount = 0;
    this.hasHostBehaviors = false;
    this.fragment = null;
    this.targetOffset = 0;
    this.viewBehaviorFactories = null;
    this.hostBehaviorFactories = null;
    this.html = html;
    this.directives = directives;
  }
  /**
   * Creates an HTMLView instance based on this template definition.
   * @param hostBindingTarget - The element that host behaviors will be bound to.
   */


  create(hostBindingTarget) {
    if (this.fragment === null) {
      let template;
      const html = this.html;

      if (typeof html === "string") {
        template = document.createElement("template");
        template.innerHTML = DOM.createHTML(html);
        const fec = template.content.firstElementChild;

        if (fec !== null && fec.tagName === "TEMPLATE") {
          template = fec;
        }
      } else {
        template = html;
      }

      const result = compileTemplate(template, this.directives);
      this.fragment = result.fragment;
      this.viewBehaviorFactories = result.viewBehaviorFactories;
      this.hostBehaviorFactories = result.hostBehaviorFactories;
      this.targetOffset = result.targetOffset;
      this.behaviorCount = this.viewBehaviorFactories.length + this.hostBehaviorFactories.length;
      this.hasHostBehaviors = this.hostBehaviorFactories.length > 0;
    }

    const fragment = this.fragment.cloneNode(true);
    const viewFactories = this.viewBehaviorFactories;
    const behaviors = new Array(this.behaviorCount);
    const walker = DOM.createTemplateWalker(fragment);
    let behaviorIndex = 0;
    let targetIndex = this.targetOffset;
    let node = walker.nextNode();

    for (let ii = viewFactories.length; behaviorIndex < ii; ++behaviorIndex) {
      const factory = viewFactories[behaviorIndex];
      const factoryIndex = factory.targetIndex;

      while (node !== null) {
        if (targetIndex === factoryIndex) {
          behaviors[behaviorIndex] = factory.createBehavior(node);
          break;
        } else {
          node = walker.nextNode();
          targetIndex++;
        }
      }
    }

    if (this.hasHostBehaviors) {
      const hostFactories = this.hostBehaviorFactories;

      for (let i = 0, ii = hostFactories.length; i < ii; ++i, ++behaviorIndex) {
        behaviors[behaviorIndex] = hostFactories[i].createBehavior(hostBindingTarget);
      }
    }

    return new HTMLView(fragment, behaviors);
  }
  /**
   * Creates an HTMLView from this template, binds it to the source, and then appends it to the host.
   * @param source - The data source to bind the template to.
   * @param host - The Element where the template will be rendered.
   * @param hostBindingTarget - An HTML element to target the host bindings at if different from the
   * host that the template is being attached to.
   */


  render(source, host, hostBindingTarget) {
    if (typeof host === "string") {
      host = document.getElementById(host);
    }

    if (hostBindingTarget === void 0) {
      hostBindingTarget = host;
    }

    const view = this.create(hostBindingTarget);
    view.bind(source, defaultExecutionContext);
    view.appendTo(host);
    return view;
  }

} // Much thanks to LitHTML for working this out!

const lastAttributeNameRegex =
/* eslint-disable-next-line no-control-regex */
/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;
/**
 * Transforms a template literal string into a renderable ViewTemplate.
 * @param strings - The string fragments that are interpolated with the values.
 * @param values - The values that are interpolated with the string fragments.
 * @remarks
 * The html helper supports interpolation of strings, numbers, binding expressions,
 * other template instances, and Directive instances.
 * @public
 */

function html(strings, ...values) {
  const directives = [];
  let html = "";

  for (let i = 0, ii = strings.length - 1; i < ii; ++i) {
    const currentString = strings[i];
    let value = values[i];
    html += currentString;

    if (value instanceof ViewTemplate) {
      const template = value;

      value = () => template;
    }

    if (typeof value === "function") {
      value = new HTMLBindingDirective(value);
    }

    if (value instanceof TargetedHTMLDirective) {
      const match = lastAttributeNameRegex.exec(currentString);

      if (match !== null) {
        value.targetName = match[2];
      }
    }

    if (value instanceof HTMLDirective) {
      // Since not all values are directives, we can't use i
      // as the index for the placeholder. Instead, we need to
      // use directives.length to get the next index.
      html += value.createPlaceholder(directives.length);
      directives.push(value);
    } else {
      html += value;
    }
  }

  html += strings[strings.length - 1];
  return new ViewTemplate(html, directives);
}

/**
 * Represents styles that can be applied to a custom element.
 * @public
 */

class ElementStyles {
  constructor() {
    this.targets = new WeakSet();
    /** @internal */

    this.behaviors = null;
  }
  /** @internal */


  addStylesTo(target) {
    this.targets.add(target);
  }
  /** @internal */


  removeStylesFrom(target) {
    this.targets.delete(target);
  }
  /** @internal */


  isAttachedTo(target) {
    return this.targets.has(target);
  }
  /**
   * Associates behaviors with this set of styles.
   * @param behaviors - The behaviors to associate.
   */


  withBehaviors(...behaviors) {
    this.behaviors = this.behaviors === null ? behaviors : this.behaviors.concat(behaviors);
    return this;
  }

}
/**
 * Create ElementStyles from ComposableStyles.
 */

ElementStyles.create = (() => {
  if (DOM.supportsAdoptedStyleSheets) {
    const styleSheetCache = new Map();
    return styles => // eslint-disable-next-line @typescript-eslint/no-use-before-define
    new AdoptedStyleSheetsStyles(styles, styleSheetCache);
  } // eslint-disable-next-line @typescript-eslint/no-use-before-define


  return styles => new StyleElementStyles(styles);
})();

function reduceStyles(styles) {
  return styles.map(x => x instanceof ElementStyles ? reduceStyles(x.styles) : [x]).reduce((prev, curr) => prev.concat(curr), []);
}

function reduceBehaviors(styles) {
  return styles.map(x => x instanceof ElementStyles ? x.behaviors : null).reduce((prev, curr) => {
    if (curr === null) {
      return prev;
    }

    if (prev === null) {
      prev = [];
    }

    return prev.concat(curr);
  }, null);
}
/**
 * https://wicg.github.io/construct-stylesheets/
 * https://developers.google.com/web/updates/2019/02/constructable-stylesheets
 *
 * @internal
 */


class AdoptedStyleSheetsStyles extends ElementStyles {
  constructor(styles, styleSheetCache) {
    super();
    this.styles = styles;
    this.styleSheetCache = styleSheetCache;
    this._styleSheets = void 0;
    this.behaviors = reduceBehaviors(styles);
  }

  get styleSheets() {
    if (this._styleSheets === void 0) {
      const styles = this.styles;
      const styleSheetCache = this.styleSheetCache;
      this._styleSheets = reduceStyles(styles).map(x => {
        if (x instanceof CSSStyleSheet) {
          return x;
        }

        let sheet = styleSheetCache.get(x);

        if (sheet === void 0) {
          sheet = new CSSStyleSheet();
          sheet.replaceSync(x);
          styleSheetCache.set(x, sheet);
        }

        return sheet;
      });
    }

    return this._styleSheets;
  }

  addStylesTo(target) {
    target.adoptedStyleSheets = [...target.adoptedStyleSheets, ...this.styleSheets];
    super.addStylesTo(target);
  }

  removeStylesFrom(target) {
    const sourceSheets = this.styleSheets;
    target.adoptedStyleSheets = target.adoptedStyleSheets.filter(x => sourceSheets.indexOf(x) === -1);
    super.removeStylesFrom(target);
  }

}
let styleClassId = 0;

function getNextStyleClass() {
  return `fast-style-class-${++styleClassId}`;
}
/**
 * @internal
 */


class StyleElementStyles extends ElementStyles {
  constructor(styles) {
    super();
    this.styles = styles;
    this.behaviors = null;
    this.behaviors = reduceBehaviors(styles);
    this.styleSheets = reduceStyles(styles);
    this.styleClass = getNextStyleClass();
  }

  addStylesTo(target) {
    const styleSheets = this.styleSheets;
    const styleClass = this.styleClass;
    target = this.normalizeTarget(target);

    for (let i = 0; i < styleSheets.length; i++) {
      const element = document.createElement("style");
      element.innerHTML = styleSheets[i];
      element.className = styleClass;
      target.append(element);
    }

    super.addStylesTo(target);
  }

  removeStylesFrom(target) {
    target = this.normalizeTarget(target);
    const styles = target.querySelectorAll(`.${this.styleClass}`);

    for (let i = 0, ii = styles.length; i < ii; ++i) {
      target.removeChild(styles[i]);
    }

    super.removeStylesFrom(target);
  }

  isAttachedTo(target) {
    return super.isAttachedTo(this.normalizeTarget(target));
  }

  normalizeTarget(target) {
    return target === document ? document.body : target;
  }

}

/**
 * A {@link ValueConverter} that converts to and from `boolean` values.
 * @remarks
 * Used automatically when the `boolean` {@link AttributeMode} is selected.
 * @public
 */

const booleanConverter = {
  toView(value) {
    return value ? "true" : "false";
  },

  fromView(value) {
    if (value === null || value === void 0 || value === "false" || value === false || value === 0) {
      return false;
    }

    return true;
  }

};
/**
 * An implementation of {@link Accessor} that supports reactivity,
 * change callbacks, attribute reflection, and type conversion for
 * custom elements.
 * @public
 */

class AttributeDefinition {
  /**
   * Creates an instance of AttributeDefinition.
   * @param Owner - The class constructor that owns this attribute.
   * @param name - The name of the property associated with the attribute.
   * @param attribute - The name of the attribute in HTML.
   * @param mode - The {@link AttributeMode} that describes the behavior of this attribute.
   * @param converter - A {@link ValueConverter} that integrates with the property getter/setter
   * to convert values to and from a DOM string.
   */
  constructor(Owner, name, attribute = name.toLowerCase(), mode = "reflect", converter) {
    this.guards = new Set();
    this.Owner = Owner;
    this.name = name;
    this.attribute = attribute;
    this.mode = mode;
    this.converter = converter;
    this.fieldName = `_${name}`;
    this.callbackName = `${name}Changed`;
    this.hasCallback = this.callbackName in Owner.prototype;

    if (mode === "boolean" && converter === void 0) {
      this.converter = booleanConverter;
    }
  }
  /**
   * Sets the value of the attribute/property on the source element.
   * @param source - The source element to access.
   * @param value - The value to set the attribute/property to.
   */


  setValue(source, newValue) {
    const oldValue = source[this.fieldName];
    const converter = this.converter;

    if (converter !== void 0) {
      newValue = converter.fromView(newValue);
    }

    if (oldValue !== newValue) {
      source[this.fieldName] = newValue;
      this.tryReflectToAttribute(source);

      if (this.hasCallback) {
        source[this.callbackName](oldValue, newValue);
      }

      source.$fastController.notify(this.name);
    }
  }
  /**
   * Gets the value of the attribute/property on the source element.
   * @param source - The source element to access.
   */


  getValue(source) {
    Observable.track(source, this.name);
    return source[this.fieldName];
  }
  /** @internal */


  onAttributeChangedCallback(element, value) {
    if (this.guards.has(element)) {
      return;
    }

    this.guards.add(element);
    this.setValue(element, value);
    this.guards.delete(element);
  }

  tryReflectToAttribute(element) {
    const mode = this.mode;
    const guards = this.guards;

    if (guards.has(element) || mode === "fromView") {
      return;
    }

    DOM.queueUpdate(() => {
      guards.add(element);
      const latestValue = element[this.fieldName];

      switch (mode) {
        case "reflect":
          const converter = this.converter;
          DOM.setAttribute(element, this.attribute, converter !== void 0 ? converter.toView(latestValue) : latestValue);
          break;

        case "boolean":
          DOM.setBooleanAttribute(element, this.attribute, latestValue);
          break;
      }

      guards.delete(element);
    });
  }
  /**
   * Collects all attribute definitions associated with the owner.
   * @param Owner - The class constructor to collect attribute for.
   * @param attributeLists - Any existing attributes to collect and merge with those associated with the owner.
   * @internal
   */


  static collect(Owner, ...attributeLists) {
    const attributes = [];
    attributeLists.push(Owner.attributes);

    for (let i = 0, ii = attributeLists.length; i < ii; ++i) {
      const list = attributeLists[i];

      if (list === void 0) {
        continue;
      }

      for (let j = 0, jj = list.length; j < jj; ++j) {
        const config = list[j];

        if (typeof config === "string") {
          attributes.push(new AttributeDefinition(Owner, config));
        } else {
          attributes.push(new AttributeDefinition(Owner, config.property, config.attribute, config.mode, config.converter));
        }
      }
    }

    return attributes;
  }

}
function attr(configOrTarget, prop) {
  let config;

  function decorator($target, $prop) {
    if (arguments.length > 1) {
      // Non invocation:
      // - @attr
      // Invocation with or w/o opts:
      // - @attr()
      // - @attr({...opts})
      config.property = $prop;
    }

    const attributes = $target.constructor.attributes || ($target.constructor.attributes = []);
    attributes.push(config);
  }

  if (arguments.length > 1) {
    // Non invocation:
    // - @attr
    config = {};
    decorator(configOrTarget, prop);
    return;
  } // Invocation with or w/o opts:
  // - @attr()
  // - @attr({...opts})


  config = configOrTarget === void 0 ? {} : configOrTarget;
  return decorator;
}

const defaultShadowOptions = {
  mode: "open"
};
const defaultElementOptions = {};
const fastDefinitions = new Map();
/**
 * Defines metadata for a FASTElement.
 * @public
 */

class FASTElementDefinition {
  /**
   * Creates an instance of FASTElementDefinition.
   * @param type - The type this definition is being created for.
   * @param nameOrConfig - The name of the element to define or a config object
   * that describes the element to define.
   */
  constructor(type, nameOrConfig = type.definition) {
    if (typeof nameOrConfig === "string") {
      nameOrConfig = {
        name: nameOrConfig
      };
    }

    this.type = type;
    this.name = nameOrConfig.name;
    this.template = nameOrConfig.template;
    const attributes = AttributeDefinition.collect(type, nameOrConfig.attributes);
    const observedAttributes = new Array(attributes.length);
    const propertyLookup = {};
    const attributeLookup = {};

    for (let i = 0, ii = attributes.length; i < ii; ++i) {
      const current = attributes[i];
      observedAttributes[i] = current.attribute;
      propertyLookup[current.name] = current;
      attributeLookup[current.attribute] = current;
    }

    this.attributes = attributes;
    this.observedAttributes = observedAttributes;
    this.propertyLookup = propertyLookup;
    this.attributeLookup = attributeLookup;
    this.shadowOptions = nameOrConfig.shadowOptions === void 0 ? defaultShadowOptions : nameOrConfig.shadowOptions === null ? void 0 : Object.assign(Object.assign({}, defaultShadowOptions), nameOrConfig.shadowOptions);
    this.elementOptions = nameOrConfig.elementOptions === void 0 ? defaultElementOptions : Object.assign(Object.assign({}, defaultElementOptions), nameOrConfig.elementOptions);
    this.styles = nameOrConfig.styles === void 0 ? void 0 : Array.isArray(nameOrConfig.styles) ? ElementStyles.create(nameOrConfig.styles) : nameOrConfig.styles instanceof ElementStyles ? nameOrConfig.styles : ElementStyles.create([nameOrConfig.styles]);
  }
  /**
   * Defines a custom element based on this definition.
   * @param registry - The element registry to define the element in.
   */


  define(registry = customElements) {
    const type = this.type;

    if (!this.isDefined) {
      const attributes = this.attributes;
      const proto = type.prototype;

      for (let i = 0, ii = attributes.length; i < ii; ++i) {
        Observable.defineProperty(proto, attributes[i]);
      }

      Reflect.defineProperty(type, "observedAttributes", {
        value: this.observedAttributes,
        enumerable: true
      });
      fastDefinitions.set(type, this);
      this.isDefined = true;
    }

    if (!registry.get(this.name)) {
      registry.define(this.name, type, this.elementOptions);
    }

    return this;
  }
  /**
   * Gets the element definition associated with the specified type.
   * @param type - The custom element type to retrieve the definition for.
   */


  static forType(type) {
    return fastDefinitions.get(type);
  }

}

const shadowRoots = new WeakMap();
const defaultEventOptions = {
  bubbles: true,
  composed: true,
  cancelable: true
};

function getShadowRoot(element) {
  return element.shadowRoot || shadowRoots.get(element) || null;
}
/**
 * Controls the lifecycle and rendering of a `FASTElement`.
 * @public
 */


class Controller extends PropertyChangeNotifier {
  /**
   * Creates a Controller to control the specified element.
   * @param element - The element to be controlled by this controller.
   * @param definition - The element definition metadata that instructs this
   * controller in how to handle rendering and other platform integrations.
   * @internal
   */
  constructor(element, definition) {
    super(element);
    this.boundObservables = null;
    this.behaviors = null;
    this.needsInitialization = true;
    this._template = null;
    this._styles = null;
    this._isConnected = false;
    /**
     * This allows Observable.getNotifier(...) to return the Controller
     * when the notifier for the Controller itself is being requested. The
     * result is that the Observable system does not need to create a separate
     * instance of Notifier for observables on the Controller. The component and
     * the controller will now share the same notifier, removing one-object construct
     * per web component instance.
     */

    this.$fastController = this;
    /**
     * The view associated with the custom element.
     * @remarks
     * If `null` then the element is managing its own rendering.
     */

    this.view = null;
    this.element = element;
    this.definition = definition;
    const shadowOptions = definition.shadowOptions;

    if (shadowOptions !== void 0) {
      const shadowRoot = element.attachShadow(shadowOptions);

      if (shadowOptions.mode === "closed") {
        shadowRoots.set(element, shadowRoot);
      }
    } // Capture any observable values that were set by the binding engine before
    // the browser upgraded the element. Then delete the property since it will
    // shadow the getter/setter that is required to make the observable operate.
    // Later, in the connect callback, we'll re-apply the values.


    const accessors = Observable.getAccessors(element);

    if (accessors.length > 0) {
      const boundObservables = this.boundObservables = Object.create(null);

      for (let i = 0, ii = accessors.length; i < ii; ++i) {
        const propertyName = accessors[i].name;
        const value = element[propertyName];

        if (value !== void 0) {
          delete element[propertyName];
          boundObservables[propertyName] = value;
        }
      }
    }
  }
  /**
   * Indicates whether or not the custom element has been
   * connected to the document.
   */


  get isConnected() {
    Observable.track(this, "isConnected");
    return this._isConnected;
  }

  setIsConnected(value) {
    this._isConnected = value;
    Observable.notify(this, "isConnected");
  }
  /**
   * Gets/sets the template used to render the component.
   * @remarks
   * This value can only be accurately read after connect but can be set at any time.
   */


  get template() {
    return this._template;
  }

  set template(value) {
    if (this._template === value) {
      return;
    }

    this._template = value;

    if (!this.needsInitialization) {
      this.renderTemplate(value);
    }
  }
  /**
   * Gets/sets the primary styles used for the component.
   * @remarks
   * This value can only be accurately read after connect but can be set at any time.
   */


  get styles() {
    return this._styles;
  }

  set styles(value) {
    if (this._styles === value) {
      return;
    }

    if (this._styles !== null) {
      this.removeStyles(this._styles);
    }

    this._styles = value;

    if (!this.needsInitialization && value !== null) {
      this.addStyles(value);
    }
  }
  /**
   * Adds styles to this element. Providing an HTMLStyleElement will attach the element instance to the shadowRoot.
   * @param styles - The styles to add.
   */


  addStyles(styles) {
    const target = getShadowRoot(this.element) || this.element.getRootNode();

    if (styles instanceof HTMLStyleElement) {
      target.append(styles);
    } else if (!styles.isAttachedTo(target)) {
      const sourceBehaviors = styles.behaviors;
      styles.addStylesTo(target);

      if (sourceBehaviors !== null) {
        this.addBehaviors(sourceBehaviors);
      }
    }
  }
  /**
   * Removes styles from this element. Providing an HTMLStyleElement will detach the element instance from the shadowRoot.
   * @param styles - the styles to remove.
   */


  removeStyles(styles) {
    const target = getShadowRoot(this.element) || this.element.getRootNode();

    if (styles instanceof HTMLStyleElement) {
      target.removeChild(styles);
    } else if (styles.isAttachedTo(target)) {
      const sourceBehaviors = styles.behaviors;
      styles.removeStylesFrom(target);

      if (sourceBehaviors !== null) {
        this.removeBehaviors(sourceBehaviors);
      }
    }
  }
  /**
   * Adds behaviors to this element.
   * @param behaviors - The behaviors to add.
   */


  addBehaviors(behaviors) {
    const targetBehaviors = this.behaviors || (this.behaviors = new Map());
    const length = behaviors.length;
    const behaviorsToBind = [];

    for (let i = 0; i < length; ++i) {
      const behavior = behaviors[i];

      if (targetBehaviors.has(behavior)) {
        targetBehaviors.set(behavior, targetBehaviors.get(behavior) + 1);
      } else {
        targetBehaviors.set(behavior, 1);
        behaviorsToBind.push(behavior);
      }
    }

    if (this._isConnected) {
      const element = this.element;

      for (let i = 0; i < behaviorsToBind.length; ++i) {
        behaviorsToBind[i].bind(element, defaultExecutionContext);
      }
    }
  }
  /**
   * Removes behaviors from this element.
   * @param behaviors - The behaviors to remove.
   * @param force - Forces unbinding of behaviors.
   */


  removeBehaviors(behaviors, force = false) {
    const targetBehaviors = this.behaviors;

    if (targetBehaviors === null) {
      return;
    }

    const length = behaviors.length;
    const behaviorsToUnbind = [];

    for (let i = 0; i < length; ++i) {
      const behavior = behaviors[i];

      if (targetBehaviors.has(behavior)) {
        const count = targetBehaviors.get(behavior) - 1;
        count === 0 || force ? targetBehaviors.delete(behavior) && behaviorsToUnbind.push(behavior) : targetBehaviors.set(behavior, count);
      }
    }

    if (this._isConnected) {
      const element = this.element;

      for (let i = 0; i < behaviorsToUnbind.length; ++i) {
        behaviorsToUnbind[i].unbind(element);
      }
    }
  }
  /**
   * Runs connected lifecycle behavior on the associated element.
   */


  onConnectedCallback() {
    if (this._isConnected) {
      return;
    }

    const element = this.element;

    if (this.needsInitialization) {
      this.finishInitialization();
    } else if (this.view !== null) {
      this.view.bind(element, defaultExecutionContext);
    }

    const behaviors = this.behaviors;

    if (behaviors !== null) {
      for (const [behavior] of behaviors) {
        behavior.bind(element, defaultExecutionContext);
      }
    }

    this.setIsConnected(true);
  }
  /**
   * Runs disconnected lifecycle behavior on the associated element.
   */


  onDisconnectedCallback() {
    if (!this._isConnected) {
      return;
    }

    this.setIsConnected(false);
    const view = this.view;

    if (view !== null) {
      view.unbind();
    }

    const behaviors = this.behaviors;

    if (behaviors !== null) {
      const element = this.element;

      for (const [behavior] of behaviors) {
        behavior.unbind(element);
      }
    }
  }
  /**
   * Runs the attribute changed callback for the associated element.
   * @param name - The name of the attribute that changed.
   * @param oldValue - The previous value of the attribute.
   * @param newValue - The new value of the attribute.
   */


  onAttributeChangedCallback(name, oldValue, newValue) {
    const attrDef = this.definition.attributeLookup[name];

    if (attrDef !== void 0) {
      attrDef.onAttributeChangedCallback(this.element, newValue);
    }
  }
  /**
   * Emits a custom HTML event.
   * @param type - The type name of the event.
   * @param detail - The event detail object to send with the event.
   * @param options - The event options. By default bubbles and composed.
   * @remarks
   * Only emits events if connected.
   */


  emit(type, detail, options) {
    if (this._isConnected) {
      return this.element.dispatchEvent(new CustomEvent(type, Object.assign(Object.assign({
        detail
      }, defaultEventOptions), options)));
    }

    return false;
  }

  finishInitialization() {
    const element = this.element;
    const boundObservables = this.boundObservables; // If we have any observables that were bound, re-apply their values.

    if (boundObservables !== null) {
      const propertyNames = Object.keys(boundObservables);

      for (let i = 0, ii = propertyNames.length; i < ii; ++i) {
        const propertyName = propertyNames[i];
        element[propertyName] = boundObservables[propertyName];
      }

      this.boundObservables = null;
    }

    const definition = this.definition; // 1. Template overrides take top precedence.

    if (this._template === null) {
      if (this.element.resolveTemplate) {
        // 2. Allow for element instance overrides next.
        this._template = this.element.resolveTemplate();
      } else if (definition.template) {
        // 3. Default to the static definition.
        this._template = definition.template || null;
      }
    } // If we have a template after the above process, render it.
    // If there's no template, then the element author has opted into
    // custom rendering and they will managed the shadow root's content themselves.


    if (this._template !== null) {
      this.renderTemplate(this._template);
    } // 1. Styles overrides take top precedence.


    if (this._styles === null) {
      if (this.element.resolveStyles) {
        // 2. Allow for element instance overrides next.
        this._styles = this.element.resolveStyles();
      } else if (definition.styles) {
        // 3. Default to the static definition.
        this._styles = definition.styles || null;
      }
    } // If we have styles after the above process, add them.


    if (this._styles !== null) {
      this.addStyles(this._styles);
    }

    this.needsInitialization = false;
  }

  renderTemplate(template) {
    const element = this.element; // When getting the host to render to, we start by looking
    // up the shadow root. If there isn't one, then that means
    // we're doing a Light DOM render to the element's direct children.

    const host = getShadowRoot(element) || element;

    if (this.view !== null) {
      // If there's already a view, we need to unbind and remove through dispose.
      this.view.dispose();
      this.view = null;
    } else if (!this.needsInitialization) {
      // If there was previous custom rendering, we need to clear out the host.
      DOM.removeChildNodes(host);
    }

    if (template) {
      // If a new template was provided, render it.
      this.view = template.render(element, host, element);
    }
  }
  /**
   * Locates or creates a controller for the specified element.
   * @param element - The element to return the controller for.
   * @remarks
   * The specified element must have a {@link FASTElementDefinition}
   * registered either through the use of the {@link customElement}
   * decorator or a call to `FASTElement.define`.
   */


  static forCustomElement(element) {
    const controller = element.$fastController;

    if (controller !== void 0) {
      return controller;
    }

    const definition = FASTElementDefinition.forType(element.constructor);

    if (definition === void 0) {
      throw new Error("Missing FASTElement definition.");
    }

    return element.$fastController = new Controller(element, definition);
  }

}

/* eslint-disable-next-line @typescript-eslint/explicit-function-return-type */

function createFASTElement(BaseType) {
  return class extends BaseType {
    constructor() {
      /* eslint-disable-next-line */
      super();
      Controller.forCustomElement(this);
    }

    $emit(type, detail, options) {
      return this.$fastController.emit(type, detail, options);
    }

    connectedCallback() {
      this.$fastController.onConnectedCallback();
    }

    disconnectedCallback() {
      this.$fastController.onDisconnectedCallback();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      this.$fastController.onAttributeChangedCallback(name, oldValue, newValue);
    }

  };
}
/**
 * A minimal base class for FASTElements that also provides
 * static helpers for working with FASTElements.
 * @public
 */


const FASTElement = Object.assign(createFASTElement(HTMLElement), {
  /**
   * Creates a new FASTElement base class inherited from the
   * provided base type.
   * @param BaseType - The base element type to inherit from.
   */
  from(BaseType) {
    return createFASTElement(BaseType);
  },

  /**
   * Defines a platform custom element based on the provided type and definition.
   * @param type - The custom element type to define.
   * @param nameOrDef - The name of the element to define or a definition object
   * that describes the element to define.
   */
  define(type, nameOrDef) {
    return new FASTElementDefinition(type, nameOrDef).define().type;
  }

});

/**
 * Directive for use in {@link css}.
 *
 * @public
 */
class CSSDirective {
  /**
   * Creates a CSS fragment to interpolate into the CSS document.
   * @returns - the string to interpolate into CSS
   */
  createCSS() {
    return "";
  }
  /**
   * Creates a behavior to bind to the host element.
   * @returns - the behavior to bind to the host element, or undefined.
   */


  createBehavior() {
    return undefined;
  }

}

function collectStyles(strings, values) {
  const styles = [];
  let cssString = "";
  const behaviors = [];

  for (let i = 0, ii = strings.length - 1; i < ii; ++i) {
    cssString += strings[i];
    let value = values[i];

    if (value instanceof CSSDirective) {
      const behavior = value.createBehavior();
      value = value.createCSS();

      if (behavior) {
        behaviors.push(behavior);
      }
    }

    if (value instanceof ElementStyles || value instanceof CSSStyleSheet) {
      if (cssString.trim() !== "") {
        styles.push(cssString);
        cssString = "";
      }

      styles.push(value);
    } else {
      cssString += value;
    }
  }

  cssString += strings[strings.length - 1];

  if (cssString.trim() !== "") {
    styles.push(cssString);
  }

  return {
    styles,
    behaviors
  };
}
/**
 * Transforms a template literal string into styles.
 * @param strings - The string fragments that are interpolated with the values.
 * @param values - The values that are interpolated with the string fragments.
 * @remarks
 * The css helper supports interpolation of strings and ElementStyle instances.
 * @public
 */


function css(strings, ...values) {
  const {
    styles,
    behaviors
  } = collectStyles(strings, values);
  const elementStyles = ElementStyles.create(styles);

  if (behaviors.length) {
    elementStyles.withBehaviors(...behaviors);
  }

  return elementStyles;
}

class CSSPartial extends CSSDirective {
  constructor(styles, behaviors) {
    super();
    this.behaviors = behaviors;
    this.css = "";
    const stylesheets = styles.reduce((accumulated, current) => {
      if (typeof current === "string") {
        this.css += current;
      } else {
        accumulated.push(current);
      }

      return accumulated;
    }, []);

    if (stylesheets.length) {
      this.styles = ElementStyles.create(stylesheets);
    }
  }

  createBehavior() {
    return this;
  }

  createCSS() {
    return this.css;
  }

  bind(el) {
    if (this.styles) {
      el.$fastController.addStyles(this.styles);
    }

    if (this.behaviors.length) {
      el.$fastController.addBehaviors(this.behaviors);
    }
  }

  unbind(el) {
    if (this.styles) {
      el.$fastController.removeStyles(this.styles);
    }

    if (this.behaviors.length) {
      el.$fastController.removeBehaviors(this.behaviors);
    }
  }

}

/**
 * The runtime behavior for template references.
 * @public
 */

class RefBehavior {
  /**
   * Creates an instance of RefBehavior.
   * @param target - The element to reference.
   * @param propertyName - The name of the property to assign the reference to.
   */
  constructor(target, propertyName) {
    this.target = target;
    this.propertyName = propertyName;
  }
  /**
   * Bind this behavior to the source.
   * @param source - The source to bind to.
   * @param context - The execution context that the binding is operating within.
   */


  bind(source) {
    source[this.propertyName] = this.target;
  }
  /**
   * Unbinds this behavior from the source.
   * @param source - The source to unbind from.
   */

  /* eslint-disable-next-line @typescript-eslint/no-empty-function */


  unbind() {}

}
/**
 * A directive that observes the updates a property with a reference to the element.
 * @param propertyName - The name of the property to assign the reference to.
 * @public
 */

function ref(propertyName) {
  return new AttachedBehaviorHTMLDirective("fast-ref", RefBehavior, propertyName);
}

/**
 * A base class for node observation.
 * @internal
 */

class NodeObservationBehavior {
  /**
   * Creates an instance of NodeObservationBehavior.
   * @param target - The target to assign the nodes property on.
   * @param options - The options to use in configuring node observation.
   */
  constructor(target, options) {
    this.target = target;
    this.options = options;
    this.source = null;
  }
  /**
   * Bind this behavior to the source.
   * @param source - The source to bind to.
   * @param context - The execution context that the binding is operating within.
   */


  bind(source) {
    const name = this.options.property;
    this.shouldUpdate = Observable.getAccessors(source).some(x => x.name === name);
    this.source = source;
    this.updateTarget(this.computeNodes());

    if (this.shouldUpdate) {
      this.observe();
    }
  }
  /**
   * Unbinds this behavior from the source.
   * @param source - The source to unbind from.
   */


  unbind() {
    this.updateTarget(emptyArray);
    this.source = null;

    if (this.shouldUpdate) {
      this.disconnect();
    }
  }
  /** @internal */


  handleEvent() {
    this.updateTarget(this.computeNodes());
  }

  computeNodes() {
    let nodes = this.getNodes();

    if (this.options.filter !== void 0) {
      nodes = nodes.filter(this.options.filter);
    }

    return nodes;
  }

  updateTarget(value) {
    this.source[this.options.property] = value;
  }

}

/**
 * The runtime behavior for slotted node observation.
 * @public
 */

class SlottedBehavior extends NodeObservationBehavior {
  /**
   * Creates an instance of SlottedBehavior.
   * @param target - The slot element target to observe.
   * @param options - The options to use when observing the slot.
   */
  constructor(target, options) {
    super(target, options);
  }
  /**
   * Begins observation of the nodes.
   */


  observe() {
    this.target.addEventListener("slotchange", this);
  }
  /**
   * Disconnects observation of the nodes.
   */


  disconnect() {
    this.target.removeEventListener("slotchange", this);
  }
  /**
   * Retrieves the nodes that should be assigned to the target.
   */


  getNodes() {
    return this.target.assignedNodes(this.options);
  }

}
/**
 * A directive that observes the `assignedNodes()` of a slot and updates a property
 * whenever they change.
 * @param propertyOrOptions - The options used to configure slotted node observation.
 * @public
 */

function slotted(propertyOrOptions) {
  if (typeof propertyOrOptions === "string") {
    propertyOrOptions = {
      property: propertyOrOptions
    };
  }

  return new AttachedBehaviorHTMLDirective("fast-slotted", SlottedBehavior, propertyOrOptions);
}

/**
 * A mixin class implementing start and end elements.
 * These are generally used to decorate text elements with icons or other visual indicators.
 * @public
 */

class StartEnd {
  handleStartContentChange() {
    this.startContainer.classList.toggle("start", this.start.assignedNodes().length > 0);
  }

  handleEndContentChange() {
    this.endContainer.classList.toggle("end", this.end.assignedNodes().length > 0);
  }

}
/**
 * The template for the end element.
 * For use with {@link StartEnd}
 *
 * @public
 */

const endSlotTemplate = (context, definition) => html`<span part="end" ${ref("endContainer")} class=${x => definition.end ? "end" : void 0}><slot name="end" ${ref("end")} @slotchange="${x => x.handleEndContentChange()}">${definition.end || ""}</slot></span>`;
/**
 * The template for the start element.
 * For use with {@link StartEnd}
 *
 * @public
 */

const startSlotTemplate = (context, definition) => html`<span part="start" ${ref("startContainer")} class="${x => definition.start ? "start" : void 0}"><slot name="start" ${ref("start")} @slotchange="${x => x.handleStartContentChange()}">${definition.start || ""}</slot></span>`;
/**
 * The template for the end element.
 * For use with {@link StartEnd}
 *
 * @public
 * @deprecated - use endSlotTemplate
 */

html`<span part="end" ${ref("endContainer")}><slot name="end" ${ref("end")} @slotchange="${x => x.handleEndContentChange()}"></slot></span>`;
/**
 * The template for the start element.
 * For use with {@link StartEnd}
 *
 * @public
 * @deprecated - use startSlotTemplate
 */

html`<span part="start" ${ref("startContainer")}><slot name="start" ${ref("start")} @slotchange="${x => x.handleStartContentChange()}"></slot></span>`;

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function __decorate(decorators, target, key, desc) {
  var c = arguments.length,
      r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
      d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

/**
 * Big thanks to https://github.com/fkleuver and the https://github.com/aurelia/aurelia project
 * for the bulk of this code and many of the associated tests.
 */

const metadataByTarget = new Map();

if (!("metadata" in Reflect)) {
  Reflect.metadata = function (key, value) {
    return function (target) {
      Reflect.defineMetadata(key, value, target);
    };
  };

  Reflect.defineMetadata = function (key, value, target) {
    let metadata = metadataByTarget.get(target);

    if (metadata === void 0) {
      metadataByTarget.set(target, metadata = new Map());
    }

    metadata.set(key, value);
  };

  Reflect.getOwnMetadata = function (key, target) {
    const metadata = metadataByTarget.get(target);

    if (metadata !== void 0) {
      return metadata.get(key);
    }

    return void 0;
  };
}
/**
 * A utility class used that constructs and registers resolvers for a dependency
 * injection container. Supports a standard set of object lifetimes.
 * @public
 */


class ResolverBuilder {
  /**
   *
   * @param container - The container to create resolvers for.
   * @param key - The key to register resolvers under.
   */
  constructor(container, key) {
    this.container = container;
    this.key = key;
  }
  /**
   * Creates a resolver for an existing object instance.
   * @param value - The instance to resolve.
   * @returns The resolver.
   */


  instance(value) {
    return this.registerResolver(0
    /* instance */
    , value);
  }
  /**
   * Creates a resolver that enforces a singleton lifetime.
   * @param value - The type to create and cache the singleton for.
   * @returns The resolver.
   */


  singleton(value) {
    return this.registerResolver(1
    /* singleton */
    , value);
  }
  /**
   * Creates a resolver that creates a new instance for every dependency request.
   * @param value - The type to create instances of.
   * @returns - The resolver.
   */


  transient(value) {
    return this.registerResolver(2
    /* transient */
    , value);
  }
  /**
   * Creates a resolver that invokes a callback function for every dependency resolution
   * request, allowing custom logic to return the dependency.
   * @param value - The callback to call during resolution.
   * @returns The resolver.
   */


  callback(value) {
    return this.registerResolver(3
    /* callback */
    , value);
  }
  /**
   * Creates a resolver that invokes a callback function the first time that a dependency
   * resolution is requested. The returned value is then cached and provided for all
   * subsequent requests.
   * @param value - The callback to call during the first resolution.
   * @returns The resolver.
   */


  cachedCallback(value) {
    return this.registerResolver(3
    /* callback */
    , cacheCallbackResult(value));
  }
  /**
   * Aliases the current key to a different key.
   * @param destinationKey - The key to point the alias to.
   * @returns The resolver.
   */


  aliasTo(destinationKey) {
    return this.registerResolver(5
    /* alias */
    , destinationKey);
  }

  registerResolver(strategy, state) {
    const {
      container,
      key
    } = this;
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */

    this.container = this.key = void 0;
    return container.registerResolver(key, new ResolverImpl(key, strategy, state));
  }

}

function cloneArrayWithPossibleProps(source) {
  const clone = source.slice();
  const keys = Object.keys(source);
  const len = keys.length;
  let key;

  for (let i = 0; i < len; ++i) {
    key = keys[i];

    if (!isArrayIndex(key)) {
      clone[key] = source[key];
    }
  }

  return clone;
}
/**
 * A set of default resolvers useful in configuring a container.
 * @public
 */


const DefaultResolver = Object.freeze({
  /**
   * Disables auto-registration and throws for all un-registered dependencies.
   * @param key - The key to create the resolver for.
   */
  none(key) {
    throw Error(`${key.toString()} not registered, did you forget to add @singleton()?`);
  },

  /**
   * Provides default singleton resolution behavior during auto-registration.
   * @param key - The key to create the resolver for.
   * @returns The resolver.
   */
  singleton(key) {
    return new ResolverImpl(key, 1
    /* singleton */
    , key);
  },

  /**
   * Provides default transient resolution behavior during auto-registration.
   * @param key - The key to create the resolver for.
   * @returns The resolver.
   */
  transient(key) {
    return new ResolverImpl(key, 2
    /* transient */
    , key);
  }

});
/**
 * Configuration for a dependency injection container.
 * @public
 */

const ContainerConfiguration = Object.freeze({
  /**
   * The default configuration used when creating a DOM-disconnected container.
   * @remarks
   * The default creates a root container, with no parent container. It does not handle
   * owner requests and it uses singleton resolution behavior for auto-registration.
   */
  default: Object.freeze({
    parentLocator: () => null,
    responsibleForOwnerRequests: false,
    defaultResolver: DefaultResolver.singleton
  })
});
const dependencyLookup = new Map();

function getParamTypes(key) {
  return Type => {
    return Reflect.getOwnMetadata(key, Type);
  };
}

let rootDOMContainer = null;
/**
 * The gateway to dependency injection APIs.
 * @public
 */

const DI = Object.freeze({
  /**
   * Creates a new dependency injection container.
   * @param config - The configuration for the container.
   * @returns A newly created dependency injection container.
   */
  createContainer(config) {
    return new ContainerImpl(null, Object.assign({}, ContainerConfiguration.default, config));
  },

  /**
   * Finds the dependency injection container responsible for providing dependencies
   * to the specified node.
   * @param node - The node to find the responsible container for.
   * @returns The container responsible for providing dependencies to the node.
   * @remarks
   * This will be the same as the parent container if the specified node
   * does not itself host a container configured with responsibleForOwnerRequests.
   */
  findResponsibleContainer(node) {
    const owned = node.$$container$$;

    if (owned && owned.responsibleForOwnerRequests) {
      return owned;
    }

    return DI.findParentContainer(node);
  },

  /**
   * Find the dependency injection container up the DOM tree from this node.
   * @param node - The node to find the parent container for.
   * @returns The parent container of this node.
   * @remarks
   * This will be the same as the responsible container if the specified node
   * does not itself host a container configured with responsibleForOwnerRequests.
   */
  findParentContainer(node) {
    const event = new CustomEvent(DILocateParentEventType, {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        container: void 0
      }
    });
    node.dispatchEvent(event);
    return event.detail.container || DI.getOrCreateDOMContainer();
  },

  /**
   * Returns a dependency injection container if one is explicitly owned by the specified
   * node. If one is not owned, then a new container is created and assigned to the node.
   * @param node - The node to find or create the container for.
   * @param config - The configuration for the container if one needs to be created.
   * @returns The located or created container.
   * @remarks
   * This API does not search for a responsible or parent container. It looks only for a container
   * directly defined on the specified node and creates one at that location if one does not
   * already exist.
   */
  getOrCreateDOMContainer(node, config) {
    if (!node) {
      return rootDOMContainer || (rootDOMContainer = new ContainerImpl(null, Object.assign({}, ContainerConfiguration.default, config, {
        parentLocator: () => null
      })));
    }

    return node.$$container$$ || new ContainerImpl(node, Object.assign({}, ContainerConfiguration.default, config, {
      parentLocator: DI.findParentContainer
    }));
  },

  /**
   * Gets the "design:paramtypes" metadata for the specified type.
   * @param Type - The type to get the metadata for.
   * @returns The metadata array or undefined if no metadata is found.
   */
  getDesignParamtypes: getParamTypes("design:paramtypes"),

  /**
   * Gets the "di:paramtypes" metadata for the specified type.
   * @param Type - The type to get the metadata for.
   * @returns The metadata array or undefined if no metadata is found.
   */
  getAnnotationParamtypes: getParamTypes("di:paramtypes"),

  /**
   *
   * @param Type - Gets the "di:paramtypes" metadata for the specified type. If none is found,
   * an empty metadata array is created and added.
   * @returns The metadata array.
   */
  getOrCreateAnnotationParamTypes(Type) {
    let annotationParamtypes = this.getAnnotationParamtypes(Type);

    if (annotationParamtypes === void 0) {
      Reflect.defineMetadata("di:paramtypes", annotationParamtypes = [], Type);
    }

    return annotationParamtypes;
  },

  /**
   * Gets the dependency keys representing what is needed to instantiate the specified type.
   * @param Type - The type to get the dependencies for.
   * @returns An array of dependency keys.
   */
  getDependencies(Type) {
    // Note: Every detail of this getDependencies method is pretty deliberate at the moment, and probably not yet 100% tested from every possible angle,
    // so be careful with making changes here as it can have a huge impact on complex end user apps.
    // Preferably, only make changes to the dependency resolution process via a RFC.
    let dependencies = dependencyLookup.get(Type);

    if (dependencies === void 0) {
      // Type.length is the number of constructor parameters. If this is 0, it could mean the class has an empty constructor
      // but it could also mean the class has no constructor at all (in which case it inherits the constructor from the prototype).
      // Non-zero constructor length + no paramtypes means emitDecoratorMetadata is off, or the class has no decorator.
      // We're not doing anything with the above right now, but it's good to keep in mind for any future issues.
      const inject = Type.inject;

      if (inject === void 0) {
        // design:paramtypes is set by tsc when emitDecoratorMetadata is enabled.
        const designParamtypes = DI.getDesignParamtypes(Type); // di:paramtypes is set by the parameter decorator from DI.createInterface or by @inject

        const annotationParamtypes = DI.getAnnotationParamtypes(Type);

        if (designParamtypes === void 0) {
          if (annotationParamtypes === void 0) {
            // Only go up the prototype if neither static inject nor any of the paramtypes is defined, as
            // there is no sound way to merge a type's deps with its prototype's deps
            const Proto = Object.getPrototypeOf(Type);

            if (typeof Proto === "function" && Proto !== Function.prototype) {
              dependencies = cloneArrayWithPossibleProps(DI.getDependencies(Proto));
            } else {
              dependencies = [];
            }
          } else {
            // No design:paramtypes so just use the di:paramtypes
            dependencies = cloneArrayWithPossibleProps(annotationParamtypes);
          }
        } else if (annotationParamtypes === void 0) {
          // No di:paramtypes so just use the design:paramtypes
          dependencies = cloneArrayWithPossibleProps(designParamtypes);
        } else {
          // We've got both, so merge them (in case of conflict on same index, di:paramtypes take precedence)
          dependencies = cloneArrayWithPossibleProps(designParamtypes);
          let len = annotationParamtypes.length;
          let auAnnotationParamtype;

          for (let i = 0; i < len; ++i) {
            auAnnotationParamtype = annotationParamtypes[i];

            if (auAnnotationParamtype !== void 0) {
              dependencies[i] = auAnnotationParamtype;
            }
          }

          const keys = Object.keys(annotationParamtypes);
          len = keys.length;
          let key;

          for (let i = 0; i < len; ++i) {
            key = keys[i];

            if (!isArrayIndex(key)) {
              dependencies[key] = annotationParamtypes[key];
            }
          }
        }
      } else {
        // Ignore paramtypes if we have static inject
        dependencies = cloneArrayWithPossibleProps(inject);
      }

      dependencyLookup.set(Type, dependencies);
    }

    return dependencies;
  },

  /**
   * Defines a property on a web component class. The value of this property will
   * be resolved from the dependency injection container responsible for the element
   * instance, based on where it is connected in the DOM.
   * @param target - The target to define the property on.
   * @param propertyName - The name of the property to define.
   * @param key - The dependency injection key.
   * @param respectConnection - Indicates whether or not to update the property value if the
   * hosting component is disconnected and then re-connected at a different location in the DOM.
   * @remarks
   * The respectConnection option is only applicable to elements that descend from FASTElement.
   */
  defineProperty(target, propertyName, key, respectConnection = false) {
    const diPropertyKey = `$di_${propertyName}`;
    Reflect.defineProperty(target, propertyName, {
      get: function () {
        let value = this[diPropertyKey];

        if (value === void 0) {
          const container = this instanceof HTMLElement ? DI.findResponsibleContainer(this) : DI.getOrCreateDOMContainer();
          value = container.get(key);
          this[diPropertyKey] = value;

          if (respectConnection && this instanceof FASTElement) {
            const notifier = this.$fastController;

            const handleChange = () => {
              const newContainer = DI.findResponsibleContainer(this);
              const newValue = newContainer.get(key);
              const oldValue = this[diPropertyKey];

              if (newValue !== oldValue) {
                this[diPropertyKey] = value;
                notifier.notify(propertyName);
              }
            };

            notifier.subscribe({
              handleChange
            }, "isConnected");
          }
        }

        return value;
      }
    });
  },

  /**
   * Creates a dependency injection key.
   * @param nameConfigOrCallback - A friendly name for the key or a lambda that configures a
   * default resolution for the dependency.
   * @param configuror - If a friendly name was provided for the first parameter, then an optional
   * lambda that configures a default resolution for the dependency can be provided second.
   * @returns The created key.
   * @remarks
   * The created key can be used as a property decorator or constructor parameter decorator,
   * in addition to its standard use in an inject array or through direct container APIs.
   */
  createInterface(nameConfigOrCallback, configuror) {
    const configure = typeof nameConfigOrCallback === "function" ? nameConfigOrCallback : configuror;
    const friendlyName = typeof nameConfigOrCallback === "string" ? nameConfigOrCallback : nameConfigOrCallback && "friendlyName" in nameConfigOrCallback ? nameConfigOrCallback.friendlyName || defaultFriendlyName : defaultFriendlyName;
    const respectConnection = typeof nameConfigOrCallback === "string" ? false : nameConfigOrCallback && "respectConnection" in nameConfigOrCallback ? nameConfigOrCallback.respectConnection || false : false;

    const Interface = function (target, property, index) {
      if (target == null || new.target !== undefined) {
        throw new Error(`No registration for interface: '${Interface.friendlyName}'`);
      }

      if (property) {
        DI.defineProperty(target, property, Interface, respectConnection);
      } else {
        const annotationParamtypes = DI.getOrCreateAnnotationParamTypes(target);
        annotationParamtypes[index] = Interface;
      }
    };

    Interface.$isInterface = true;
    Interface.friendlyName = friendlyName == null ? "(anonymous)" : friendlyName;

    if (configure != null) {
      Interface.register = function (container, key) {
        return configure(new ResolverBuilder(container, key !== null && key !== void 0 ? key : Interface));
      };
    }

    Interface.toString = function toString() {
      return `InterfaceSymbol<${Interface.friendlyName}>`;
    };

    return Interface;
  },

  /**
   * A decorator that specifies what to inject into its target.
   * @param dependencies - The dependencies to inject.
   * @returns The decorator to be applied to the target class.
   * @remarks
   * The decorator can be used to decorate a class, listing all of the classes dependencies.
   * Or it can be used to decorate a constructor paramter, indicating what to inject for that
   * parameter.
   * Or it can be used for a web component property, indicating what that property should resolve to.
   */
  inject(...dependencies) {
    return function (target, key, descriptor) {
      if (typeof descriptor === "number") {
        // It's a parameter decorator.
        const annotationParamtypes = DI.getOrCreateAnnotationParamTypes(target);
        const dep = dependencies[0];

        if (dep !== void 0) {
          annotationParamtypes[descriptor] = dep;
        }
      } else if (key) {
        DI.defineProperty(target, key, dependencies[0]);
      } else {
        const annotationParamtypes = descriptor ? DI.getOrCreateAnnotationParamTypes(descriptor.value) : DI.getOrCreateAnnotationParamTypes(target);
        let dep;

        for (let i = 0; i < dependencies.length; ++i) {
          dep = dependencies[i];

          if (dep !== void 0) {
            annotationParamtypes[i] = dep;
          }
        }
      }
    };
  },

  /**
   * Registers the `target` class as a transient dependency; each time the dependency is resolved
   * a new instance will be created.
   *
   * @param target - The class / constructor function to register as transient.
   * @returns The same class, with a static `register` method that takes a container and returns the appropriate resolver.
   *
   * @example
   * On an existing class
   * ```ts
   * class Foo { }
   * DI.transient(Foo);
   * ```
   *
   * @example
   * Inline declaration
   *
   * ```ts
   * const Foo = DI.transient(class { });
   * // Foo is now strongly typed with register
   * Foo.register(container);
   * ```
   *
   * @public
   */
  transient(target) {
    target.register = function register(container) {
      const registration = Registration.transient(target, target);
      return registration.register(container);
    };

    target.registerInRequestor = false;
    return target;
  },

  /**
   * Registers the `target` class as a singleton dependency; the class will only be created once. Each
   * consecutive time the dependency is resolved, the same instance will be returned.
   *
   * @param target - The class / constructor function to register as a singleton.
   * @returns The same class, with a static `register` method that takes a container and returns the appropriate resolver.
   * @example
   * On an existing class
   * ```ts
   * class Foo { }
   * DI.singleton(Foo);
   * ```
   *
   * @example
   * Inline declaration
   * ```ts
   * const Foo = DI.singleton(class { });
   * // Foo is now strongly typed with register
   * Foo.register(container);
   * ```
   *
   * @public
   */
  singleton(target, options = defaultSingletonOptions) {
    target.register = function register(container) {
      const registration = Registration.singleton(target, target);
      return registration.register(container);
    };

    target.registerInRequestor = options.scoped;
    return target;
  }

});
/**
 * The interface key that resolves the dependency injection container itself.
 * @public
 */

const Container = DI.createInterface("Container");
/**
 * A decorator that specifies what to inject into its target.
 * @param dependencies - The dependencies to inject.
 * @returns The decorator to be applied to the target class.
 * @remarks
 * The decorator can be used to decorate a class, listing all of the classes dependencies.
 * Or it can be used to decorate a constructor paramter, indicating what to inject for that
 * parameter.
 * Or it can be used for a web component property, indicating what that property should resolve to.
 *
 * @public
 */


DI.inject;
const defaultSingletonOptions = {
  scoped: false
};
/** @internal */


class ResolverImpl {
  constructor(key, strategy, state) {
    this.key = key;
    this.strategy = strategy;
    this.state = state;
    this.resolving = false;
  }

  get $isResolver() {
    return true;
  }

  register(container) {
    return container.registerResolver(this.key, this);
  }

  resolve(handler, requestor) {
    switch (this.strategy) {
      case 0
      /* instance */
      :
        return this.state;

      case 1
      /* singleton */
      :
        {
          if (this.resolving) {
            throw new Error(`Cyclic dependency found: ${this.state.name}`);
          }

          this.resolving = true;
          this.state = handler.getFactory(this.state).construct(requestor);
          this.strategy = 0
          /* instance */
          ;
          this.resolving = false;
          return this.state;
        }

      case 2
      /* transient */
      :
        {
          // Always create transients from the requesting container
          const factory = handler.getFactory(this.state);

          if (factory === null) {
            throw new Error(`Resolver for ${String(this.key)} returned a null factory`);
          }

          return factory.construct(requestor);
        }

      case 3
      /* callback */
      :
        return this.state(handler, requestor, this);

      case 4
      /* array */
      :
        return this.state[0].resolve(handler, requestor);

      case 5
      /* alias */
      :
        return requestor.get(this.state);

      default:
        throw new Error(`Invalid resolver strategy specified: ${this.strategy}.`);
    }
  }

  getFactory(container) {
    var _a, _b, _c;

    switch (this.strategy) {
      case 1
      /* singleton */
      :
      case 2
      /* transient */
      :
        return container.getFactory(this.state);

      case 5
      /* alias */
      :
        return (_c = (_b = (_a = container.getResolver(this.state)) === null || _a === void 0 ? void 0 : _a.getFactory) === null || _b === void 0 ? void 0 : _b.call(_a, container)) !== null && _c !== void 0 ? _c : null;

      default:
        return null;
    }
  }

}

function containerGetKey(d) {
  return this.get(d);
}

function transformInstance(inst, transform) {
  return transform(inst);
}
/** @internal */


class FactoryImpl {
  constructor(Type, dependencies) {
    this.Type = Type;
    this.dependencies = dependencies;
    this.transformers = null;
  }

  construct(container, dynamicDependencies) {
    let instance;

    if (dynamicDependencies === void 0) {
      instance = new this.Type(...this.dependencies.map(containerGetKey, container));
    } else {
      instance = new this.Type(...this.dependencies.map(containerGetKey, container), ...dynamicDependencies);
    }

    if (this.transformers == null) {
      return instance;
    }

    return this.transformers.reduce(transformInstance, instance);
  }

  registerTransformer(transformer) {
    (this.transformers || (this.transformers = [])).push(transformer);
  }

}
const containerResolver = {
  $isResolver: true,

  resolve(handler, requestor) {
    return requestor;
  }

};

function isRegistry(obj) {
  return typeof obj.register === "function";
}

function isSelfRegistry(obj) {
  return isRegistry(obj) && typeof obj.registerInRequestor === "boolean";
}

function isRegisterInRequester(obj) {
  return isSelfRegistry(obj) && obj.registerInRequestor;
}

function isClass(obj) {
  return obj.prototype !== void 0;
}

const InstrinsicTypeNames = new Set(["Array", "ArrayBuffer", "Boolean", "DataView", "Date", "Error", "EvalError", "Float32Array", "Float64Array", "Function", "Int8Array", "Int16Array", "Int32Array", "Map", "Number", "Object", "Promise", "RangeError", "ReferenceError", "RegExp", "Set", "SharedArrayBuffer", "String", "SyntaxError", "TypeError", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "URIError", "WeakMap", "WeakSet"]);
const DILocateParentEventType = "__DI_LOCATE_PARENT__";
const factories = new Map();
/**
 * @internal
 */

class ContainerImpl {
  constructor(owner, config) {
    this.owner = owner;
    this.config = config;
    this._parent = void 0;
    this.registerDepth = 0;
    this.context = null;

    if (owner !== null) {
      owner.$$container$$ = this;
    }

    this.resolvers = new Map();
    this.resolvers.set(Container, containerResolver);

    if (owner instanceof Node) {
      owner.addEventListener(DILocateParentEventType, e => {
        if (e.composedPath()[0] !== this.owner) {
          e.detail.container = this;
          e.stopImmediatePropagation();
        }
      });
    }
  }

  get parent() {
    if (this._parent === void 0) {
      this._parent = this.config.parentLocator(this.owner);
    }

    return this._parent;
  }

  get depth() {
    return this.parent === null ? 0 : this.parent.depth + 1;
  }

  get responsibleForOwnerRequests() {
    return this.config.responsibleForOwnerRequests;
  }

  registerWithContext(context, ...params) {
    this.context = context;
    this.register(...params);
    this.context = null;
    return this;
  }

  register(...params) {
    if (++this.registerDepth === 100) {
      throw new Error("Unable to autoregister dependency"); // Most likely cause is trying to register a plain object that does not have a
      // register method and is not a class constructor
    }

    let current;
    let keys;
    let value;
    let j;
    let jj;
    const context = this.context;

    for (let i = 0, ii = params.length; i < ii; ++i) {
      current = params[i];

      if (!isObject(current)) {
        continue;
      }

      if (isRegistry(current)) {
        current.register(this, context);
      } else if (isClass(current)) {
        Registration.singleton(current, current).register(this);
      } else {
        keys = Object.keys(current);
        j = 0;
        jj = keys.length;

        for (; j < jj; ++j) {
          value = current[keys[j]];

          if (!isObject(value)) {
            continue;
          } // note: we could remove this if-branch and call this.register directly
          // - the extra check is just a perf tweak to create fewer unnecessary arrays by the spread operator


          if (isRegistry(value)) {
            value.register(this, context);
          } else {
            this.register(value);
          }
        }
      }
    }

    --this.registerDepth;
    return this;
  }

  registerResolver(key, resolver) {
    validateKey(key);
    const resolvers = this.resolvers;
    const result = resolvers.get(key);

    if (result == null) {
      resolvers.set(key, resolver);
    } else if (result instanceof ResolverImpl && result.strategy === 4
    /* array */
    ) {
      result.state.push(resolver);
    } else {
      resolvers.set(key, new ResolverImpl(key, 4
      /* array */
      , [result, resolver]));
    }

    return resolver;
  }

  registerTransformer(key, transformer) {
    const resolver = this.getResolver(key);

    if (resolver == null) {
      return false;
    }

    if (resolver.getFactory) {
      const factory = resolver.getFactory(this);

      if (factory == null) {
        return false;
      } // This type cast is a bit of a hacky one, necessary due to the duplicity of IResolverLike.
      // Problem is that that interface's type arg can be of type Key, but the getFactory method only works on
      // type Constructable. So the return type of that optional method has this additional constraint, which
      // seems to confuse the type checker.


      factory.registerTransformer(transformer);
      return true;
    }

    return false;
  }

  getResolver(key, autoRegister = true) {
    validateKey(key);

    if (key.resolve !== void 0) {
      return key;
    }
    /* eslint-disable-next-line @typescript-eslint/no-this-alias */


    let current = this;
    let resolver;

    while (current != null) {
      resolver = current.resolvers.get(key);

      if (resolver == null) {
        if (current.parent == null) {
          const handler = isRegisterInRequester(key) ? this : current;
          return autoRegister ? this.jitRegister(key, handler) : null;
        }

        current = current.parent;
      } else {
        return resolver;
      }
    }

    return null;
  }

  has(key, searchAncestors = false) {
    return this.resolvers.has(key) ? true : searchAncestors && this.parent != null ? this.parent.has(key, true) : false;
  }

  get(key) {
    validateKey(key);

    if (key.$isResolver) {
      return key.resolve(this, this);
    }
    /* eslint-disable-next-line @typescript-eslint/no-this-alias */


    let current = this;
    let resolver;

    while (current != null) {
      resolver = current.resolvers.get(key);

      if (resolver == null) {
        if (current.parent == null) {
          const handler = isRegisterInRequester(key) ? this : current;
          resolver = this.jitRegister(key, handler);
          return resolver.resolve(current, this);
        }

        current = current.parent;
      } else {
        return resolver.resolve(current, this);
      }
    }

    throw new Error(`Unable to resolve key: ${key}`);
  }

  getAll(key, searchAncestors = false) {
    validateKey(key);
    /* eslint-disable-next-line @typescript-eslint/no-this-alias */

    const requestor = this;
    let current = requestor;
    let resolver;

    if (searchAncestors) {
      let resolutions = emptyArray;

      while (current != null) {
        resolver = current.resolvers.get(key);

        if (resolver != null) {
          resolutions = resolutions.concat(
          /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
          buildAllResponse(resolver, current, requestor));
        }

        current = current.parent;
      }

      return resolutions;
    } else {
      while (current != null) {
        resolver = current.resolvers.get(key);

        if (resolver == null) {
          current = current.parent;

          if (current == null) {
            return emptyArray;
          }
        } else {
          return buildAllResponse(resolver, current, requestor);
        }
      }
    }

    return emptyArray;
  }

  getFactory(Type) {
    let factory = factories.get(Type);

    if (factory === void 0) {
      if (isNativeFunction(Type)) {
        throw new Error(`${Type.name} is a native function and therefore cannot be safely constructed by DI. If this is intentional, please use a callback or cachedCallback resolver.`);
      }

      factories.set(Type, factory = new FactoryImpl(Type, DI.getDependencies(Type)));
    }

    return factory;
  }

  registerFactory(key, factory) {
    factories.set(key, factory);
  }

  createChild(config) {
    return new ContainerImpl(null, Object.assign({}, this.config, config, {
      parentLocator: () => this
    }));
  }

  jitRegister(keyAsValue, handler) {
    if (typeof keyAsValue !== "function") {
      throw new Error(`Attempted to jitRegister something that is not a constructor: '${keyAsValue}'. Did you forget to register this dependency?`);
    }

    if (InstrinsicTypeNames.has(keyAsValue.name)) {
      throw new Error(`Attempted to jitRegister an intrinsic type: ${keyAsValue.name}. Did you forget to add @inject(Key)`);
    }

    if (isRegistry(keyAsValue)) {
      const registrationResolver = keyAsValue.register(handler);

      if (!(registrationResolver instanceof Object) || registrationResolver.resolve == null) {
        const newResolver = handler.resolvers.get(keyAsValue);

        if (newResolver != void 0) {
          return newResolver;
        }

        throw new Error("A valid resolver was not returned from the static register method");
      }

      return registrationResolver;
    } else if (keyAsValue.$isInterface) {
      throw new Error(`Attempted to jitRegister an interface: ${keyAsValue.friendlyName}`);
    } else {
      const resolver = this.config.defaultResolver(keyAsValue, handler);
      handler.resolvers.set(keyAsValue, resolver);
      return resolver;
    }
  }

}
const cache = new WeakMap();

function cacheCallbackResult(fun) {
  return function (handler, requestor, resolver) {
    if (cache.has(resolver)) {
      return cache.get(resolver);
    }

    const t = fun(handler, requestor, resolver);
    cache.set(resolver, t);
    return t;
  };
}
/**
 * You can use the resulting Registration of any of the factory methods
 * to register with the container.
 *
 * @example
 * ```
 * class Foo {}
 * const container = DI.createContainer();
 * container.register(Registration.instance(Foo, new Foo()));
 * container.get(Foo);
 * ```
 *
 * @public
 */


const Registration = Object.freeze({
  /**
   * Allows you to pass an instance.
   * Every time you request this {@link Key} you will get this instance back.
   *
   * @example
   * ```
   * Registration.instance(Foo, new Foo()));
   * ```
   *
   * @param key - The key to register the instance under.
   * @param value - The instance to return when the key is requested.
   */
  instance(key, value) {
    return new ResolverImpl(key, 0
    /* instance */
    , value);
  },

  /**
   * Creates an instance from the class.
   * Every time you request this {@link Key} you will get the same one back.
   *
   * @example
   * ```
   * Registration.singleton(Foo, Foo);
   * ```
   *
   * @param key - The key to register the singleton under.
   * @param value - The class to instantiate as a singleton when first requested.
   */
  singleton(key, value) {
    return new ResolverImpl(key, 1
    /* singleton */
    , value);
  },

  /**
   * Creates an instance from a class.
   * Every time you request this {@link Key} you will get a new instance.
   *
   * @example
   * ```
   * Registration.instance(Foo, Foo);
   * ```
   *
   * @param key - The key to register the instance type under.
   * @param value - The class to instantiate each time the key is requested.
   */
  transient(key, value) {
    return new ResolverImpl(key, 2
    /* transient */
    , value);
  },

  /**
   * Delegates to a callback function to provide the dependency.
   * Every time you request this {@link Key} the callback will be invoked to provide
   * the dependency.
   *
   * @example
   * ```
   * Registration.callback(Foo, () => new Foo());
   * Registration.callback(Bar, (c: Container) => new Bar(c.get(Foo)));
   * ```
   *
   * @param key - The key to register the callback for.
   * @param callback - The function that is expected to return the dependency.
   */
  callback(key, callback) {
    return new ResolverImpl(key, 3
    /* callback */
    , callback);
  },

  /**
   * Delegates to a callback function to provide the dependency and then caches the
   * dependency for future requests.
   *
   * @example
   * ```
   * Registration.cachedCallback(Foo, () => new Foo());
   * Registration.cachedCallback(Bar, (c: Container) => new Bar(c.get(Foo)));
   * ```
   *
   * @param key - The key to register the callback for.
   * @param callback - The function that is expected to return the dependency.
   * @remarks
   * If you pass the same Registration to another container, the same cached value will be used.
   * Should all references to the resolver returned be removed, the cache will expire.
   */
  cachedCallback(key, callback) {
    return new ResolverImpl(key, 3
    /* callback */
    , cacheCallbackResult(callback));
  },

  /**
   * Creates an alternate {@link Key} to retrieve an instance by.
   *
   * @example
   * ```
   * Register.singleton(Foo, Foo)
   * Register.aliasTo(Foo, MyFoos);
   *
   * container.getAll(MyFoos) // contains an instance of Foo
   * ```
   *
   * @param originalKey - The original key that has been registered.
   * @param aliasKey - The alias to the original key.
   */
  aliasTo(originalKey, aliasKey) {
    return new ResolverImpl(aliasKey, 5
    /* alias */
    , originalKey);
  }

});
/** @internal */

function validateKey(key) {
  if (key === null || key === void 0) {
    throw new Error("key/value cannot be null or undefined. Are you trying to inject/register something that doesn't exist with DI?");
  }
}

function buildAllResponse(resolver, handler, requestor) {
  if (resolver instanceof ResolverImpl && resolver.strategy === 4
  /* array */
  ) {
    const state = resolver.state;
    let i = state.length;
    const results = new Array(i);

    while (i--) {
      results[i] = state[i].resolve(handler, requestor);
    }

    return results;
  }

  return [resolver.resolve(handler, requestor)];
}

const defaultFriendlyName = "(anonymous)";

function isObject(value) {
  return typeof value === "object" && value !== null || typeof value === "function";
}
/**
 * Determine whether the value is a native function.
 *
 * @param fn - The function to check.
 * @returns `true` is the function is a native function, otherwise `false`
 */


const isNativeFunction = function () {
  const lookup = new WeakMap();
  let isNative = false;
  let sourceText = "";
  let i = 0;
  return function (fn) {
    isNative = lookup.get(fn);

    if (isNative === void 0) {
      sourceText = fn.toString();
      i = sourceText.length; // http://www.ecma-international.org/ecma-262/#prod-NativeFunction

      isNative = // 29 is the length of 'function () { [native code] }' which is the smallest length of a native function string
      i >= 29 && // 100 seems to be a safe upper bound of the max length of a native function. In Chrome and FF it's 56, in Edge it's 61.
      i <= 100 && // This whole heuristic *could* be tricked by a comment. Do we need to care about that?
      sourceText.charCodeAt(i - 1) === 0x7d && // }
      // TODO: the spec is a little vague about the precise constraints, so we do need to test this across various browsers to make sure just one whitespace is a safe assumption.
      sourceText.charCodeAt(i - 2) <= 0x20 && // whitespace
      sourceText.charCodeAt(i - 3) === 0x5d && // ]
      sourceText.charCodeAt(i - 4) === 0x65 && // e
      sourceText.charCodeAt(i - 5) === 0x64 && // d
      sourceText.charCodeAt(i - 6) === 0x6f && // o
      sourceText.charCodeAt(i - 7) === 0x63 && // c
      sourceText.charCodeAt(i - 8) === 0x20 && //
      sourceText.charCodeAt(i - 9) === 0x65 && // e
      sourceText.charCodeAt(i - 10) === 0x76 && // v
      sourceText.charCodeAt(i - 11) === 0x69 && // i
      sourceText.charCodeAt(i - 12) === 0x74 && // t
      sourceText.charCodeAt(i - 13) === 0x61 && // a
      sourceText.charCodeAt(i - 14) === 0x6e && // n
      sourceText.charCodeAt(i - 15) === 0x58; // [

      lookup.set(fn, isNative);
    }

    return isNative;
  };
}();

const isNumericLookup = {};

function isArrayIndex(value) {
  switch (typeof value) {
    case "number":
      return value >= 0 && (value | 0) === value;

    case "string":
      {
        const result = isNumericLookup[value];

        if (result !== void 0) {
          return result;
        }

        const length = value.length;

        if (length === 0) {
          return isNumericLookup[value] = false;
        }

        let ch = 0;

        for (let i = 0; i < length; ++i) {
          ch = value.charCodeAt(i);

          if (i === 0 && ch === 0x30 && length > 1
          /* must not start with 0 */
          || ch < 0x30
          /* 0 */
          || ch > 0x39
          /* 9 */
          ) {
            return isNumericLookup[value] = false;
          }
        }

        return isNumericLookup[value] = true;
      }

    default:
      return false;
  }
}

function presentationKeyFromTag(tagName) {
  return `${tagName.toLowerCase()}:presentation`;
}

const presentationRegistry = new Map();
/**
 * An API gateway to component presentation features.
 * @public
 */

const ComponentPresentation = Object.freeze({
  /**
   * Defines a component presentation for an element.
   * @param tagName - The element name to define the presentation for.
   * @param presentation - The presentation that will be applied to matching elements.
   * @param container - The dependency injection container to register the configuration in.
   * @public
   */
  define(tagName, presentation, container) {
    const key = presentationKeyFromTag(tagName);
    const existing = presentationRegistry.get(key);

    if (existing === void 0) {
      presentationRegistry.set(key, presentation);
    } else {
      // false indicates that we have more than one presentation
      // registered for a tagName and we must resolve through DI
      presentationRegistry.set(key, false);
    }

    container.register(Registration.instance(key, presentation));
  },

  /**
   * Finds a component presentation for the specified element name,
   * searching the DOM hierarchy starting from the provided element.
   * @param tagName - The name of the element to locate the presentation for.
   * @param element - The element to begin the search from.
   * @returns The component presentation or null if none is found.
   * @public
   */
  forTag(tagName, element) {
    const key = presentationKeyFromTag(tagName);
    const existing = presentationRegistry.get(key);

    if (existing === false) {
      const container = DI.findResponsibleContainer(element);
      return container.get(key);
    }

    return existing || null;
  }

});
/**
 * The default implementation of ComponentPresentation, used by FoundationElement.
 * @public
 */

class DefaultComponentPresentation {
  /**
   * Creates an instance of DefaultComponentPresentation.
   * @param template - The template to apply to the element.
   * @param styles - The styles to apply to the element.
   * @public
   */
  constructor(template, styles) {
    this.template = template || null;
    this.styles = styles === void 0 ? null : Array.isArray(styles) ? ElementStyles.create(styles) : styles instanceof ElementStyles ? styles : ElementStyles.create([styles]);
  }
  /**
   * Applies the presentation details to the specified element.
   * @param element - The element to apply the presentation details to.
   * @public
   */


  applyTo(element) {
    const controller = element.$fastController;

    if (controller.template === null) {
      controller.template = this.template;
    }

    if (controller.styles === null) {
      controller.styles = this.styles;
    }
  }

}

/**
 * Defines a foundation element class that:
 * 1. Connects the element to its ComponentPresentation
 * 2. Allows resolving the element template from the instance or ComponentPresentation
 * 3. Allows resolving the element styles from the instance or ComponentPresentation
 *
 * @public
 */

class FoundationElement extends FASTElement {
  constructor() {
    super(...arguments);
    this._presentation = void 0;
  }
  /**
   * A property which resolves the ComponentPresentation instance
   * for the current component.
   * @public
   */


  get $presentation() {
    if (this._presentation === void 0) {
      this._presentation = ComponentPresentation.forTag(this.tagName, this);
    }

    return this._presentation;
  }

  templateChanged() {
    if (this.template !== undefined) {
      this.$fastController.template = this.template;
    }
  }

  stylesChanged() {
    if (this.styles !== undefined) {
      this.$fastController.styles = this.styles;
    }
  }
  /**
   * The connected callback for this FASTElement.
   * @remarks
   * This method is invoked by the platform whenever this FoundationElement
   * becomes connected to the document.
   * @public
   */


  connectedCallback() {
    if (this.$presentation !== null) {
      this.$presentation.applyTo(this);
    }

    super.connectedCallback();
  }
  /**
   * Defines an element registry function with a set of element definition defaults.
   * @param elementDefinition - The definition of the element to create the registry
   * function for.
   * @public
   */


  static compose(elementDefinition) {
    return (overrideDefinition = {}) => new FoundationElementRegistry(this === FoundationElement ? class extends FoundationElement {} : this, elementDefinition, overrideDefinition);
  }

}

__decorate([observable], FoundationElement.prototype, "template", void 0);

__decorate([observable], FoundationElement.prototype, "styles", void 0);

function resolveOption(option, context, definition) {
  if (typeof option === "function") {
    return option(context, definition);
  }

  return option;
}
/**
 * Registry capable of defining presentation properties for a DOM Container hierarchy.
 *
 * @internal
 */

/* eslint-disable @typescript-eslint/no-unused-vars */


class FoundationElementRegistry {
  constructor(type, elementDefinition, overrideDefinition) {
    this.type = type;
    this.elementDefinition = elementDefinition;
    this.overrideDefinition = overrideDefinition;
    this.definition = Object.assign(Object.assign({}, this.elementDefinition), this.overrideDefinition);
  }

  register(container, context) {
    const definition = this.definition;
    const overrideDefinition = this.overrideDefinition;
    const prefix = definition.prefix || context.elementPrefix;
    const name = `${prefix}-${definition.baseName}`;
    context.tryDefineElement({
      name,
      type: this.type,
      baseClass: this.elementDefinition.baseClass,
      callback: x => {
        const presentation = new DefaultComponentPresentation(resolveOption(definition.template, x, definition), resolveOption(definition.styles, x, definition));
        x.definePresentation(presentation);
        let shadowOptions = resolveOption(definition.shadowOptions, x, definition);

        if (x.shadowRootMode) {
          // If the design system has overridden the shadow root mode, we need special handling.
          if (shadowOptions) {
            // If there are shadow options present in the definition, then
            // either the component itself has specified an option or the
            // registry function has overridden it.
            if (!overrideDefinition.shadowOptions) {
              // There were shadow options provided by the component and not overridden by
              // the registry.
              shadowOptions.mode = x.shadowRootMode;
            }
          } else if (shadowOptions !== null) {
            // If the component author did not provide shadow options,
            // and did not null them out (light dom opt-in) then they
            // were relying on the FASTElement default. So, if the
            // design system provides a mode, we need to create the options
            // to override the default.
            shadowOptions = {
              mode: x.shadowRootMode
            };
          }
        }

        x.defineElement({
          elementOptions: resolveOption(definition.elementOptions, x, definition),
          shadowOptions,
          attributes: resolveOption(definition.attributes, x, definition)
        });
      }
    });
  }

}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Apply mixins to a constructor.
 * Sourced from {@link https://www.typescriptlang.org/docs/handbook/mixins.html | TypeScript Documentation }.
 * @public
 */
function applyMixins(derivedCtor, ...baseCtors) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (name !== "constructor") {
        Object.defineProperty(derivedCtor.prototype, name,
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
      }
    });

    if (baseCtor.attributes) {
      const existing = derivedCtor.attributes || [];
      derivedCtor.attributes = existing.concat(baseCtor.attributes);
    }
  });
}

/**
 * Key Code values
 * @deprecated - KeyCodes are deprecated, use individual string key exports
 */
var KeyCodes;

(function (KeyCodes) {
  KeyCodes[KeyCodes["alt"] = 18] = "alt";
  KeyCodes[KeyCodes["arrowDown"] = 40] = "arrowDown";
  KeyCodes[KeyCodes["arrowLeft"] = 37] = "arrowLeft";
  KeyCodes[KeyCodes["arrowRight"] = 39] = "arrowRight";
  KeyCodes[KeyCodes["arrowUp"] = 38] = "arrowUp";
  KeyCodes[KeyCodes["back"] = 8] = "back";
  KeyCodes[KeyCodes["backSlash"] = 220] = "backSlash";
  KeyCodes[KeyCodes["break"] = 19] = "break";
  KeyCodes[KeyCodes["capsLock"] = 20] = "capsLock";
  KeyCodes[KeyCodes["closeBracket"] = 221] = "closeBracket";
  KeyCodes[KeyCodes["colon"] = 186] = "colon";
  KeyCodes[KeyCodes["colon2"] = 59] = "colon2";
  KeyCodes[KeyCodes["comma"] = 188] = "comma";
  KeyCodes[KeyCodes["ctrl"] = 17] = "ctrl";
  KeyCodes[KeyCodes["delete"] = 46] = "delete";
  KeyCodes[KeyCodes["end"] = 35] = "end";
  KeyCodes[KeyCodes["enter"] = 13] = "enter";
  KeyCodes[KeyCodes["equals"] = 187] = "equals";
  KeyCodes[KeyCodes["equals2"] = 61] = "equals2";
  KeyCodes[KeyCodes["equals3"] = 107] = "equals3";
  KeyCodes[KeyCodes["escape"] = 27] = "escape";
  KeyCodes[KeyCodes["forwardSlash"] = 191] = "forwardSlash";
  KeyCodes[KeyCodes["function1"] = 112] = "function1";
  KeyCodes[KeyCodes["function10"] = 121] = "function10";
  KeyCodes[KeyCodes["function11"] = 122] = "function11";
  KeyCodes[KeyCodes["function12"] = 123] = "function12";
  KeyCodes[KeyCodes["function2"] = 113] = "function2";
  KeyCodes[KeyCodes["function3"] = 114] = "function3";
  KeyCodes[KeyCodes["function4"] = 115] = "function4";
  KeyCodes[KeyCodes["function5"] = 116] = "function5";
  KeyCodes[KeyCodes["function6"] = 117] = "function6";
  KeyCodes[KeyCodes["function7"] = 118] = "function7";
  KeyCodes[KeyCodes["function8"] = 119] = "function8";
  KeyCodes[KeyCodes["function9"] = 120] = "function9";
  KeyCodes[KeyCodes["home"] = 36] = "home";
  KeyCodes[KeyCodes["insert"] = 45] = "insert";
  KeyCodes[KeyCodes["menu"] = 93] = "menu";
  KeyCodes[KeyCodes["minus"] = 189] = "minus";
  KeyCodes[KeyCodes["minus2"] = 109] = "minus2";
  KeyCodes[KeyCodes["numLock"] = 144] = "numLock";
  KeyCodes[KeyCodes["numPad0"] = 96] = "numPad0";
  KeyCodes[KeyCodes["numPad1"] = 97] = "numPad1";
  KeyCodes[KeyCodes["numPad2"] = 98] = "numPad2";
  KeyCodes[KeyCodes["numPad3"] = 99] = "numPad3";
  KeyCodes[KeyCodes["numPad4"] = 100] = "numPad4";
  KeyCodes[KeyCodes["numPad5"] = 101] = "numPad5";
  KeyCodes[KeyCodes["numPad6"] = 102] = "numPad6";
  KeyCodes[KeyCodes["numPad7"] = 103] = "numPad7";
  KeyCodes[KeyCodes["numPad8"] = 104] = "numPad8";
  KeyCodes[KeyCodes["numPad9"] = 105] = "numPad9";
  KeyCodes[KeyCodes["numPadDivide"] = 111] = "numPadDivide";
  KeyCodes[KeyCodes["numPadDot"] = 110] = "numPadDot";
  KeyCodes[KeyCodes["numPadMinus"] = 109] = "numPadMinus";
  KeyCodes[KeyCodes["numPadMultiply"] = 106] = "numPadMultiply";
  KeyCodes[KeyCodes["numPadPlus"] = 107] = "numPadPlus";
  KeyCodes[KeyCodes["openBracket"] = 219] = "openBracket";
  KeyCodes[KeyCodes["pageDown"] = 34] = "pageDown";
  KeyCodes[KeyCodes["pageUp"] = 33] = "pageUp";
  KeyCodes[KeyCodes["period"] = 190] = "period";
  KeyCodes[KeyCodes["print"] = 44] = "print";
  KeyCodes[KeyCodes["quote"] = 222] = "quote";
  KeyCodes[KeyCodes["scrollLock"] = 145] = "scrollLock";
  KeyCodes[KeyCodes["shift"] = 16] = "shift";
  KeyCodes[KeyCodes["space"] = 32] = "space";
  KeyCodes[KeyCodes["tab"] = 9] = "tab";
  KeyCodes[KeyCodes["tilde"] = 192] = "tilde";
  KeyCodes[KeyCodes["windowsLeft"] = 91] = "windowsLeft";
  KeyCodes[KeyCodes["windowsOpera"] = 219] = "windowsOpera";
  KeyCodes[KeyCodes["windowsRight"] = 92] = "windowsRight";
})(KeyCodes || (KeyCodes = {}));
const keyEnter = "Enter";

/**
 * Some states and properties are applicable to all host language elements regardless of whether a role is applied.
 * The following global states and properties are supported by all roles and by all base markup elements.
 * {@link https://www.w3.org/TR/wai-aria-1.1/#global_states}
 *
 * This is intended to be used as a mixin. Be sure you extend FASTElement.
 *
 * @public
 */

class ARIAGlobalStatesAndProperties {}

__decorate([attr({
  attribute: "aria-atomic",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaAtomic", void 0);

__decorate([attr({
  attribute: "aria-busy",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaBusy", void 0);

__decorate([attr({
  attribute: "aria-controls",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaControls", void 0);

__decorate([attr({
  attribute: "aria-current",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaCurrent", void 0);

__decorate([attr({
  attribute: "aria-describedby",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaDescribedby", void 0);

__decorate([attr({
  attribute: "aria-details",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaDetails", void 0);

__decorate([attr({
  attribute: "aria-disabled",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaDisabled", void 0);

__decorate([attr({
  attribute: "aria-errormessage",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaErrormessage", void 0);

__decorate([attr({
  attribute: "aria-flowto",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaFlowto", void 0);

__decorate([attr({
  attribute: "aria-haspopup",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaHaspopup", void 0);

__decorate([attr({
  attribute: "aria-hidden",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaHidden", void 0);

__decorate([attr({
  attribute: "aria-invalid",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaInvalid", void 0);

__decorate([attr({
  attribute: "aria-keyshortcuts",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaKeyshortcuts", void 0);

__decorate([attr({
  attribute: "aria-label",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaLabel", void 0);

__decorate([attr({
  attribute: "aria-labelledby",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaLabelledby", void 0);

__decorate([attr({
  attribute: "aria-live",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaLive", void 0);

__decorate([attr({
  attribute: "aria-owns",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaOwns", void 0);

__decorate([attr({
  attribute: "aria-relevant",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaRelevant", void 0);

__decorate([attr({
  attribute: "aria-roledescription",
  mode: "fromView"
})], ARIAGlobalStatesAndProperties.prototype, "ariaRoledescription", void 0);

/**
 * An Anchor Custom HTML Element.
 * Based largely on the {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a | <a> element }.
 *
 * @public
 */

class Anchor extends FoundationElement {
  constructor() {
    super(...arguments);
    /**
     * Overrides the focus call for where delegatesFocus is unsupported.
     * This check works for Chrome, Edge Chromium, FireFox, and Safari
     * Relevant PR on the Firefox browser: https://phabricator.services.mozilla.com/D123858
     */

    this.handleUnsupportedDelegatesFocus = () => {
      var _a; // Check to see if delegatesFocus is supported


      if (window.ShadowRoot && !window.ShadowRoot.prototype.hasOwnProperty("delegatesFocus") && ((_a = this.$fastController.definition.shadowOptions) === null || _a === void 0 ? void 0 : _a.delegatesFocus)) {
        this.focus = () => {
          this.control.focus();
        };
      }
    };
  }
  /**
   * @internal
   */


  connectedCallback() {
    super.connectedCallback();
    this.handleUnsupportedDelegatesFocus();
  }

}

__decorate([attr], Anchor.prototype, "download", void 0);

__decorate([attr], Anchor.prototype, "href", void 0);

__decorate([attr], Anchor.prototype, "hreflang", void 0);

__decorate([attr], Anchor.prototype, "ping", void 0);

__decorate([attr], Anchor.prototype, "referrerpolicy", void 0);

__decorate([attr], Anchor.prototype, "rel", void 0);

__decorate([attr], Anchor.prototype, "target", void 0);

__decorate([attr], Anchor.prototype, "type", void 0);

__decorate([observable], Anchor.prototype, "defaultSlottedContent", void 0);
/**
 * Includes ARIA states and properties relating to the ARIA link role
 *
 * @public
 */


class DelegatesARIALink {}

__decorate([attr({
  attribute: "aria-expanded",
  mode: "fromView"
})], DelegatesARIALink.prototype, "ariaExpanded", void 0);

applyMixins(DelegatesARIALink, ARIAGlobalStatesAndProperties);
applyMixins(Anchor, StartEnd, DelegatesARIALink);

const proxySlotName = "form-associated-proxy";
const ElementInternalsKey = "ElementInternals";
/**
 * @alpha
 */

const supportsElementInternals = ElementInternalsKey in window && "setFormValue" in window[ElementInternalsKey].prototype;
const InternalsMap = new Map();
/**
 * Base function for providing Custom Element Form Association.
 *
 * @alpha
 */

function FormAssociated(BaseCtor) {
  const C = class extends BaseCtor {
    constructor(...args) {
      super(...args);
      /**
       * Track whether the value has been changed from the initial value
       */

      this.dirtyValue = false;
      /**
       * Sets the element's disabled state. A disabled element will not be included during form submission.
       *
       * @remarks
       * HTML Attribute: disabled
       */

      this.disabled = false;
      /**
       * These are events that are still fired by the proxy
       * element based on user / programmatic interaction.
       *
       * The proxy implementation should be transparent to
       * the app author, so block these events from emitting.
       */

      this.proxyEventsToBlock = ["change", "click"];
      this.proxyInitialized = false;
      this.required = false;
      this.initialValue = this.initialValue || "";

      if (!this.elementInternals) {
        // When elementInternals is not supported, formResetCallback is
        // bound to an event listener, so ensure the handler's `this`
        // context is correct.
        this.formResetCallback = this.formResetCallback.bind(this);
      }
    }
    /**
     * Must evaluate to true to enable elementInternals.
     * Feature detects API support and resolve respectively
     *
     * @internal
     */


    static get formAssociated() {
      return supportsElementInternals;
    }
    /**
     * Returns the validity state of the element
     *
     * @alpha
     */


    get validity() {
      return this.elementInternals ? this.elementInternals.validity : this.proxy.validity;
    }
    /**
     * Retrieve a reference to the associated form.
     * Returns null if not associated to any form.
     *
     * @alpha
     */


    get form() {
      return this.elementInternals ? this.elementInternals.form : this.proxy.form;
    }
    /**
     * Retrieve the localized validation message,
     * or custom validation message if set.
     *
     * @alpha
     */


    get validationMessage() {
      return this.elementInternals ? this.elementInternals.validationMessage : this.proxy.validationMessage;
    }
    /**
     * Whether the element will be validated when the
     * form is submitted
     */


    get willValidate() {
      return this.elementInternals ? this.elementInternals.willValidate : this.proxy.willValidate;
    }
    /**
     * A reference to all associated label elements
     */


    get labels() {
      if (this.elementInternals) {
        return Object.freeze(Array.from(this.elementInternals.labels));
      } else if (this.proxy instanceof HTMLElement && this.proxy.ownerDocument && this.id) {
        // Labels associated by wrapping the element: <label><custom-element></custom-element></label>
        const parentLabels = this.proxy.labels; // Labels associated using the `for` attribute

        const forLabels = Array.from(this.proxy.getRootNode().querySelectorAll(`[for='${this.id}']`));
        const labels = parentLabels ? forLabels.concat(Array.from(parentLabels)) : forLabels;
        return Object.freeze(labels);
      } else {
        return emptyArray;
      }
    }
    /**
     * Invoked when the `value` property changes
     * @param previous - the previous value
     * @param next - the new value
     *
     * @remarks
     * If elements extending `FormAssociated` implement a `valueChanged` method
     * They must be sure to invoke `super.valueChanged(previous, next)` to ensure
     * proper functioning of `FormAssociated`
     */


    valueChanged(previous, next) {
      this.dirtyValue = true;

      if (this.proxy instanceof HTMLElement) {
        this.proxy.value = this.value;
      }

      this.currentValue = this.value;
      this.setFormValue(this.value);
      this.validate();
    }

    currentValueChanged() {
      this.value = this.currentValue;
    }
    /**
     * Invoked when the `initialValue` property changes
     *
     * @param previous - the previous value
     * @param next - the new value
     *
     * @remarks
     * If elements extending `FormAssociated` implement a `initialValueChanged` method
     * They must be sure to invoke `super.initialValueChanged(previous, next)` to ensure
     * proper functioning of `FormAssociated`
     */


    initialValueChanged(previous, next) {
      // If the value is clean and the component is connected to the DOM
      // then set value equal to the attribute value.
      if (!this.dirtyValue) {
        this.value = this.initialValue;
        this.dirtyValue = false;
      }
    }
    /**
     * Invoked when the `disabled` property changes
     *
     * @param previous - the previous value
     * @param next - the new value
     *
     * @remarks
     * If elements extending `FormAssociated` implement a `disabledChanged` method
     * They must be sure to invoke `super.disabledChanged(previous, next)` to ensure
     * proper functioning of `FormAssociated`
     */


    disabledChanged(previous, next) {
      if (this.proxy instanceof HTMLElement) {
        this.proxy.disabled = this.disabled;
      }

      DOM.queueUpdate(() => this.classList.toggle("disabled", this.disabled));
    }
    /**
     * Invoked when the `name` property changes
     *
     * @param previous - the previous value
     * @param next - the new value
     *
     * @remarks
     * If elements extending `FormAssociated` implement a `nameChanged` method
     * They must be sure to invoke `super.nameChanged(previous, next)` to ensure
     * proper functioning of `FormAssociated`
     */


    nameChanged(previous, next) {
      if (this.proxy instanceof HTMLElement) {
        this.proxy.name = this.name;
      }
    }
    /**
     * Invoked when the `required` property changes
     *
     * @param previous - the previous value
     * @param next - the new value
     *
     * @remarks
     * If elements extending `FormAssociated` implement a `requiredChanged` method
     * They must be sure to invoke `super.requiredChanged(previous, next)` to ensure
     * proper functioning of `FormAssociated`
     */


    requiredChanged(prev, next) {
      if (this.proxy instanceof HTMLElement) {
        this.proxy.required = this.required;
      }

      DOM.queueUpdate(() => this.classList.toggle("required", this.required));
      this.validate();
    }
    /**
     * The element internals object. Will only exist
     * in browsers supporting the attachInternals API
     */


    get elementInternals() {
      if (!supportsElementInternals) {
        return null;
      }

      let internals = InternalsMap.get(this);

      if (!internals) {
        internals = this.attachInternals();
        InternalsMap.set(this, internals);
      }

      return internals;
    }
    /**
     * @internal
     */


    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("keypress", this._keypressHandler);

      if (!this.value) {
        this.value = this.initialValue;
        this.dirtyValue = false;
      }

      if (!this.elementInternals) {
        this.attachProxy();

        if (this.form) {
          this.form.addEventListener("reset", this.formResetCallback);
        }
      }
    }
    /**
     * @internal
     */


    disconnectedCallback() {
      this.proxyEventsToBlock.forEach(name => this.proxy.removeEventListener(name, this.stopPropagation));

      if (!this.elementInternals && this.form) {
        this.form.removeEventListener("reset", this.formResetCallback);
      }
    }
    /**
     * Return the current validity of the element.
     */


    checkValidity() {
      return this.elementInternals ? this.elementInternals.checkValidity() : this.proxy.checkValidity();
    }
    /**
     * Return the current validity of the element.
     * If false, fires an invalid event at the element.
     */


    reportValidity() {
      return this.elementInternals ? this.elementInternals.reportValidity() : this.proxy.reportValidity();
    }
    /**
     * Set the validity of the control. In cases when the elementInternals object is not
     * available (and the proxy element is used to report validity), this function will
     * do nothing unless a message is provided, at which point the setCustomValidity method
     * of the proxy element will be invoked with the provided message.
     * @param flags - Validity flags
     * @param message - Optional message to supply
     * @param anchor - Optional element used by UA to display an interactive validation UI
     */


    setValidity(flags, message, anchor) {
      if (this.elementInternals) {
        this.elementInternals.setValidity(flags, message, anchor);
      } else if (typeof message === "string") {
        this.proxy.setCustomValidity(message);
      }
    }
    /**
     * Invoked when a connected component's form or fieldset has its disabled
     * state changed.
     * @param disabled - the disabled value of the form / fieldset
     */


    formDisabledCallback(disabled) {
      this.disabled = disabled;
    }

    formResetCallback() {
      this.value = this.initialValue;
      this.dirtyValue = false;
    }
    /**
     * Attach the proxy element to the DOM
     */


    attachProxy() {
      var _a;

      if (!this.proxyInitialized) {
        this.proxyInitialized = true;
        this.proxy.style.display = "none";
        this.proxyEventsToBlock.forEach(name => this.proxy.addEventListener(name, this.stopPropagation)); // These are typically mapped to the proxy during
        // property change callbacks, but during initialization
        // on the initial call of the callback, the proxy is
        // still undefined. We should find a better way to address this.

        this.proxy.disabled = this.disabled;
        this.proxy.required = this.required;

        if (typeof this.name === "string") {
          this.proxy.name = this.name;
        }

        if (typeof this.value === "string") {
          this.proxy.value = this.value;
        }

        this.proxy.setAttribute("slot", proxySlotName);
        this.proxySlot = document.createElement("slot");
        this.proxySlot.setAttribute("name", proxySlotName);
      }

      (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.appendChild(this.proxySlot);
      this.appendChild(this.proxy);
    }
    /**
     * Detach the proxy element from the DOM
     */


    detachProxy() {
      var _a;

      this.removeChild(this.proxy);
      (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.removeChild(this.proxySlot);
    }
    /**
     * Sets the validity of the custom element. By default this uses the proxy element to determine
     * validity, but this can be extended or replaced in implementation.
     */


    validate() {
      if (this.proxy instanceof HTMLElement) {
        this.setValidity(this.proxy.validity, this.proxy.validationMessage);
      }
    }
    /**
     * Associates the provided value (and optional state) with the parent form.
     * @param value - The value to set
     * @param state - The state object provided to during session restores and when autofilling.
     */


    setFormValue(value, state) {
      if (this.elementInternals) {
        this.elementInternals.setFormValue(value, state || value);
      }
    }

    _keypressHandler(e) {
      switch (e.key) {
        case keyEnter:
          if (this.form instanceof HTMLFormElement) {
            // Implicit submission
            const defaultButton = this.form.querySelector("[type=submit]");
            defaultButton === null || defaultButton === void 0 ? void 0 : defaultButton.click();
          }

          break;
      }
    }
    /**
     * Used to stop propagation of proxy element events
     * @param e - Event object
     */


    stopPropagation(e) {
      e.stopPropagation();
    }

  };
  attr({
    mode: "boolean"
  })(C.prototype, "disabled");
  attr({
    mode: "fromView",
    attribute: "value"
  })(C.prototype, "initialValue");
  attr({
    attribute: "current-value"
  })(C.prototype, "currentValue");
  attr(C.prototype, "name");
  attr({
    mode: "boolean"
  })(C.prototype, "required");
  observable(C.prototype, "value");
  return C;
}

class _Button extends FoundationElement {}
/**
 * A form-associated base class for the {@link @microsoft/fast-foundation#(Button:class)} component.
 *
 * @internal
 */


class FormAssociatedButton extends FormAssociated(_Button) {
  constructor() {
    super(...arguments);
    this.proxy = document.createElement("input");
  }

}

/**
 * A Button Custom HTML Element.
 * Based largely on the {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button | <button> element }.
 *
 * @public
 */

class Button$1 extends FormAssociatedButton {
  constructor() {
    super(...arguments);
    /**
     * Prevent events to propagate if disabled and has no slotted content wrapped in HTML elements
     * @internal
     */

    this.handleClick = e => {
      var _a;

      if (this.disabled && ((_a = this.defaultSlottedContent) === null || _a === void 0 ? void 0 : _a.length) <= 1) {
        e.stopPropagation();
      }
    };
    /**
     * Submits the parent form
     */


    this.handleSubmission = () => {
      if (!this.form) {
        return;
      }

      const attached = this.proxy.isConnected;

      if (!attached) {
        this.attachProxy();
      } // Browser support for requestSubmit is not comprehensive
      // so click the proxy if it isn't supported


      typeof this.form.requestSubmit === "function" ? this.form.requestSubmit(this.proxy) : this.proxy.click();

      if (!attached) {
        this.detachProxy();
      }
    };
    /**
     * Resets the parent form
     */


    this.handleFormReset = () => {
      var _a;

      (_a = this.form) === null || _a === void 0 ? void 0 : _a.reset();
    };
    /**
     * Overrides the focus call for where delegatesFocus is unsupported.
     * This check works for Chrome, Edge Chromium, FireFox, and Safari
     * Relevant PR on the Firefox browser: https://phabricator.services.mozilla.com/D123858
     */


    this.handleUnsupportedDelegatesFocus = () => {
      var _a; // Check to see if delegatesFocus is supported


      if (window.ShadowRoot && !window.ShadowRoot.prototype.hasOwnProperty("delegatesFocus") && ((_a = this.$fastController.definition.shadowOptions) === null || _a === void 0 ? void 0 : _a.delegatesFocus)) {
        this.focus = () => {
          this.control.focus();
        };
      }
    };
  }

  formactionChanged() {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.formAction = this.formaction;
    }
  }

  formenctypeChanged() {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.formEnctype = this.formenctype;
    }
  }

  formmethodChanged() {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.formMethod = this.formmethod;
    }
  }

  formnovalidateChanged() {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.formNoValidate = this.formnovalidate;
    }
  }

  formtargetChanged() {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.formTarget = this.formtarget;
    }
  }

  typeChanged(previous, next) {
    if (this.proxy instanceof HTMLInputElement) {
      this.proxy.type = this.type;
    }

    next === "submit" && this.addEventListener("click", this.handleSubmission);
    previous === "submit" && this.removeEventListener("click", this.handleSubmission);
    next === "reset" && this.addEventListener("click", this.handleFormReset);
    previous === "reset" && this.removeEventListener("click", this.handleFormReset);
  }
  /**
   * @internal
   */


  connectedCallback() {
    var _a;

    super.connectedCallback();
    this.proxy.setAttribute("type", this.type);
    this.handleUnsupportedDelegatesFocus();
    const elements = Array.from((_a = this.control) === null || _a === void 0 ? void 0 : _a.children);

    if (elements) {
      elements.forEach(span => {
        span.addEventListener("click", this.handleClick);
      });
    }
  }
  /**
   * @internal
   */


  disconnectedCallback() {
    var _a;

    super.disconnectedCallback();
    const elements = Array.from((_a = this.control) === null || _a === void 0 ? void 0 : _a.children);

    if (elements) {
      elements.forEach(span => {
        span.removeEventListener("click", this.handleClick);
      });
    }
  }

}

__decorate([attr({
  mode: "boolean"
})], Button$1.prototype, "autofocus", void 0);

__decorate([attr({
  attribute: "form"
})], Button$1.prototype, "formId", void 0);

__decorate([attr], Button$1.prototype, "formaction", void 0);

__decorate([attr], Button$1.prototype, "formenctype", void 0);

__decorate([attr], Button$1.prototype, "formmethod", void 0);

__decorate([attr({
  mode: "boolean"
})], Button$1.prototype, "formnovalidate", void 0);

__decorate([attr], Button$1.prototype, "formtarget", void 0);

__decorate([attr], Button$1.prototype, "type", void 0);

__decorate([observable], Button$1.prototype, "defaultSlottedContent", void 0);
/**
 * Includes ARIA states and properties relating to the ARIA button role
 *
 * @public
 */


class DelegatesARIAButton {}

__decorate([attr({
  attribute: "aria-expanded",
  mode: "fromView"
})], DelegatesARIAButton.prototype, "ariaExpanded", void 0);

__decorate([attr({
  attribute: "aria-pressed",
  mode: "fromView"
})], DelegatesARIAButton.prototype, "ariaPressed", void 0);

applyMixins(DelegatesARIAButton, ARIAGlobalStatesAndProperties);
applyMixins(Button$1, StartEnd, DelegatesARIAButton);

/**
 * Retrieves the "composed parent" element of a node, ignoring DOM tree boundaries.
 * When the parent of a node is a shadow-root, it will return the host
 * element of the shadow root. Otherwise it will return the parent node or null if
 * no parent node exists.
 * @param element - The element for which to retrieve the composed parent
 *
 * @public
 */
function composedParent(element) {
  const parentNode = element.parentElement;

  if (parentNode) {
    return parentNode;
  } else {
    const rootNode = element.getRootNode();

    if (rootNode.host instanceof HTMLElement) {
      // this is shadow-root
      return rootNode.host;
    }
  }

  return null;
}

/**
 * Determines if the reference element contains the test element in a "composed" DOM tree that
 * ignores shadow DOM boundaries.
 *
 * Returns true of the test element is a descendent of the reference, or exist in
 * a shadow DOM that is a logical descendent of the reference. Otherwise returns false.
 * @param reference - The element to test for containment against.
 * @param test - The element being tested for containment.
 *
 * @public
 */

function composedContains(reference, test) {
  let current = test;

  while (current !== null) {
    if (current === reference) {
      return true;
    }

    current = composedParent(current);
  }

  return false;
}

/**
 * A behavior to add or remove a stylesheet from an element based on a property. The behavior ensures that
 * styles are applied while the property matches and that styles are not applied if the property does
 * not match.
 *
 * @public
 */

class PropertyStyleSheetBehavior {
  /**
   * Constructs a {@link PropertyStyleSheetBehavior} instance.
   * @param propertyName - The property name to operate from.
   * @param value - The property value to operate from.
   * @param styles - The styles to coordinate with the property.
   */
  constructor(propertyName, value, styles) {
    this.propertyName = propertyName;
    this.value = value;
    this.styles = styles;
  }
  /**
   * Binds the behavior to the element.
   * @param elementInstance - The element for which the property is applied.
   */


  bind(elementInstance) {
    Observable.getNotifier(elementInstance).subscribe(this, this.propertyName);
    this.handleChange(elementInstance, this.propertyName);
  }
  /**
   * Unbinds the behavior from the element.
   * @param source - The element for which the behavior is unbinding.
   * @internal
   */


  unbind(source) {
    Observable.getNotifier(source).unsubscribe(this, this.propertyName);
    source.$fastController.removeStyles(this.styles);
  }
  /**
   * Change event for the provided element.
   * @param source - the element for which to attach or detach styles.
   * @param key - the key to lookup to know if the element already has the styles
   * @internal
   */


  handleChange(source, key) {
    if (source[key] === this.value) {
      source.$fastController.addStyles(this.styles);
    } else {
      source.$fastController.removeStyles(this.styles);
    }
  }

}

/**
 * A CSS fragment to set `display: none;` when the host is hidden using the [hidden] attribute.
 * @public
 */
const hidden = `:host([hidden]){display:none}`;
/**
 * Applies a CSS display property.
 * Also adds CSS rules to not display the element when the [hidden] attribute is applied to the element.
 * @param display - The CSS display property value
 * @public
 */

function display(displayValue) {
  return `${hidden}:host{display:${displayValue}}`;
}

const defaultElement = document.createElement("div");

function isFastElement(element) {
  return element instanceof FASTElement;
}

class QueuedStyleSheetTarget {
  setProperty(name, value) {
    DOM.queueUpdate(() => this.target.setProperty(name, value));
  }

  removeProperty(name) {
    DOM.queueUpdate(() => this.target.removeProperty(name));
  }

}
/**
 * Handles setting properties for a FASTElement using Constructable Stylesheets
 */


class ConstructableStyleSheetTarget extends QueuedStyleSheetTarget {
  constructor(source) {
    super();
    const sheet = new CSSStyleSheet();
    this.target = sheet.cssRules[sheet.insertRule(":host{}")].style;
    source.$fastController.addStyles(ElementStyles.create([sheet]));
  }

}

class DocumentStyleSheetTarget extends QueuedStyleSheetTarget {
  constructor() {
    super();
    const sheet = new CSSStyleSheet();
    this.target = sheet.cssRules[sheet.insertRule(":root{}")].style;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }

}

class HeadStyleElementStyleSheetTarget extends QueuedStyleSheetTarget {
  constructor() {
    super();
    this.style = document.createElement("style");
    document.head.appendChild(this.style);
    const {
      sheet
    } = this.style; // Because the HTMLStyleElement has been appended,
    // there shouldn't exist a case where `sheet` is null,
    // but if-check it just in case.

    if (sheet) {
      // https://github.com/jsdom/jsdom uses https://github.com/NV/CSSOM for it's CSSOM implementation,
      // which implements the DOM Level 2 spec for CSSStyleSheet where insertRule() requires an index argument.
      const index = sheet.insertRule(":root{}", sheet.cssRules.length);
      this.target = sheet.cssRules[index].style;
    }
  }

}
/**
 * Handles setting properties for a FASTElement using an HTMLStyleElement
 */


class StyleElementStyleSheetTarget {
  constructor(target) {
    this.store = new Map();
    this.target = null;
    const controller = target.$fastController;
    this.style = document.createElement("style");
    controller.addStyles(this.style);
    Observable.getNotifier(controller).subscribe(this, "isConnected");
    this.handleChange(controller, "isConnected");
  }

  targetChanged() {
    if (this.target !== null) {
      for (const [key, value] of this.store.entries()) {
        this.target.setProperty(key, value);
      }
    }
  }

  setProperty(name, value) {
    this.store.set(name, value);
    DOM.queueUpdate(() => {
      if (this.target !== null) {
        this.target.setProperty(name, value);
      }
    });
  }

  removeProperty(name) {
    this.store.delete(name);
    DOM.queueUpdate(() => {
      if (this.target !== null) {
        this.target.removeProperty(name);
      }
    });
  }

  handleChange(source, key) {
    // HTMLStyleElement.sheet is null if the element isn't connected to the DOM,
    // so this method reacts to changes in DOM connection for the element hosting
    // the HTMLStyleElement.
    //
    // All rules applied via the CSSOM also get cleared when the element disconnects,
    // so we need to add a new rule each time and populate it with the stored properties
    const {
      sheet
    } = this.style;

    if (sheet) {
      // Safari will throw if we try to use the return result of insertRule()
      // to index the rule inline, so store as a const prior to indexing.
      // https://github.com/jsdom/jsdom uses https://github.com/NV/CSSOM for it's CSSOM implementation,
      // which implements the DOM Level 2 spec for CSSStyleSheet where insertRule() requires an index argument.
      const index = sheet.insertRule(":host{}", sheet.cssRules.length);
      this.target = sheet.cssRules[index].style;
    } else {
      this.target = null;
    }
  }

}

__decorate([observable], StyleElementStyleSheetTarget.prototype, "target", void 0);
/**
 * Handles setting properties for a normal HTMLElement
 */


class ElementStyleSheetTarget {
  constructor(source) {
    this.target = source.style;
  }

  setProperty(name, value) {
    DOM.queueUpdate(() => this.target.setProperty(name, value));
  }

  removeProperty(name) {
    DOM.queueUpdate(() => this.target.removeProperty(name));
  }

}
/**
 * Controls emission for default values. This control is capable
 * of emitting to multiple {@link PropertyTarget | PropertyTargets},
 * and only emits if it has at least one root.
 *
 * @internal
 */


class RootStyleSheetTarget {
  setProperty(name, value) {
    RootStyleSheetTarget.properties[name] = value;

    for (const target of RootStyleSheetTarget.roots.values()) {
      PropertyTargetManager.getOrCreate(RootStyleSheetTarget.normalizeRoot(target)).setProperty(name, value);
    }
  }

  removeProperty(name) {
    delete RootStyleSheetTarget.properties[name];

    for (const target of RootStyleSheetTarget.roots.values()) {
      PropertyTargetManager.getOrCreate(RootStyleSheetTarget.normalizeRoot(target)).removeProperty(name);
    }
  }

  static registerRoot(root) {
    const {
      roots
    } = RootStyleSheetTarget;

    if (!roots.has(root)) {
      roots.add(root);
      const target = PropertyTargetManager.getOrCreate(this.normalizeRoot(root));

      for (const key in RootStyleSheetTarget.properties) {
        target.setProperty(key, RootStyleSheetTarget.properties[key]);
      }
    }
  }

  static unregisterRoot(root) {
    const {
      roots
    } = RootStyleSheetTarget;

    if (roots.has(root)) {
      roots.delete(root);
      const target = PropertyTargetManager.getOrCreate(RootStyleSheetTarget.normalizeRoot(root));

      for (const key in RootStyleSheetTarget.properties) {
        target.removeProperty(key);
      }
    }
  }
  /**
   * Returns the document when provided the default element,
   * otherwise is a no-op
   * @param root - the root to normalize
   */


  static normalizeRoot(root) {
    return root === defaultElement ? document : root;
  }

}
RootStyleSheetTarget.roots = new Set();
RootStyleSheetTarget.properties = {}; // Caches PropertyTarget instances

const propertyTargetCache = new WeakMap(); // Use Constructable StyleSheets for FAST elements when supported, otherwise use
// HTMLStyleElement instances

const propertyTargetCtor = DOM.supportsAdoptedStyleSheets ? ConstructableStyleSheetTarget : StyleElementStyleSheetTarget;
/**
 * Manages creation and caching of PropertyTarget instances.
 *
 * @internal
 */

const PropertyTargetManager = Object.freeze({
  getOrCreate(source) {
    if (propertyTargetCache.has(source)) {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      return propertyTargetCache.get(source);
    }

    let target;

    if (source === defaultElement) {
      target = new RootStyleSheetTarget();
    } else if (source instanceof Document) {
      target = DOM.supportsAdoptedStyleSheets ? new DocumentStyleSheetTarget() : new HeadStyleElementStyleSheetTarget();
    } else if (isFastElement(source)) {
      target = new propertyTargetCtor(source);
    } else {
      target = new ElementStyleSheetTarget(source);
    }

    propertyTargetCache.set(source, target);
    return target;
  }

});

/**
 * Implementation of {@link (DesignToken:interface)}
 */

class DesignTokenImpl extends CSSDirective {
  constructor(configuration) {
    super();
    this.subscribers = new WeakMap();
    this._appliedTo = new Set();
    this.name = configuration.name;

    if (configuration.cssCustomPropertyName !== null) {
      this.cssCustomProperty = `--${configuration.cssCustomPropertyName}`;
      this.cssVar = `var(${this.cssCustomProperty})`;
    }

    this.id = DesignTokenImpl.uniqueId();
    DesignTokenImpl.tokensById.set(this.id, this);
  }

  get appliedTo() {
    return [...this._appliedTo];
  }

  static from(nameOrConfig) {
    return new DesignTokenImpl({
      name: typeof nameOrConfig === "string" ? nameOrConfig : nameOrConfig.name,
      cssCustomPropertyName: typeof nameOrConfig === "string" ? nameOrConfig : nameOrConfig.cssCustomPropertyName === void 0 ? nameOrConfig.name : nameOrConfig.cssCustomPropertyName
    });
  }

  static isCSSDesignToken(token) {
    return typeof token.cssCustomProperty === "string";
  }

  static isDerivedDesignTokenValue(value) {
    return typeof value === "function";
  }
  /**
   * Gets a token by ID. Returns undefined if the token was not found.
   * @param id - The ID of the token
   * @returns
   */


  static getTokenById(id) {
    return DesignTokenImpl.tokensById.get(id);
  }

  getOrCreateSubscriberSet(target = this) {
    return this.subscribers.get(target) || this.subscribers.set(target, new Set()) && this.subscribers.get(target);
  }

  createCSS() {
    return this.cssVar || "";
  }

  getValueFor(element) {
    const value = DesignTokenNode.getOrCreate(element).get(this);

    if (value !== undefined) {
      return value;
    }

    throw new Error(`Value could not be retrieved for token named "${this.name}". Ensure the value is set for ${element} or an ancestor of ${element}.`);
  }

  setValueFor(element, value) {
    this._appliedTo.add(element);

    if (value instanceof DesignTokenImpl) {
      value = this.alias(value);
    }

    DesignTokenNode.getOrCreate(element).set(this, value);
    return this;
  }

  deleteValueFor(element) {
    this._appliedTo.delete(element);

    if (DesignTokenNode.existsFor(element)) {
      DesignTokenNode.getOrCreate(element).delete(this);
    }

    return this;
  }

  withDefault(value) {
    this.setValueFor(defaultElement, value);
    return this;
  }

  subscribe(subscriber, target) {
    const subscriberSet = this.getOrCreateSubscriberSet(target);

    if (target && !DesignTokenNode.existsFor(target)) {
      DesignTokenNode.getOrCreate(target);
    }

    if (!subscriberSet.has(subscriber)) {
      subscriberSet.add(subscriber);
    }
  }

  unsubscribe(subscriber, target) {
    const list = this.subscribers.get(target || this);

    if (list && list.has(subscriber)) {
      list.delete(subscriber);
    }
  }
  /**
   * Notifies subscribers that the value for an element has changed.
   * @param element - The element to emit a notification for
   */


  notify(element) {
    const record = Object.freeze({
      token: this,
      target: element
    });

    if (this.subscribers.has(this)) {
      this.subscribers.get(this).forEach(sub => sub.handleChange(record));
    }

    if (this.subscribers.has(element)) {
      this.subscribers.get(element).forEach(sub => sub.handleChange(record));
    }
  }
  /**
   * Alias the token to the provided token.
   * @param token - the token to alias to
   */


  alias(token) {
    return target => token.getValueFor(target);
  }

}

DesignTokenImpl.uniqueId = (() => {
  let id = 0;
  return () => {
    id++;
    return id.toString(16);
  };
})();
/**
 * Token storage by token ID
 */


DesignTokenImpl.tokensById = new Map();

class CustomPropertyReflector {
  startReflection(token, target) {
    token.subscribe(this, target);
    this.handleChange({
      token,
      target
    });
  }

  stopReflection(token, target) {
    token.unsubscribe(this, target);
    this.remove(token, target);
  }

  handleChange(record) {
    const {
      token,
      target
    } = record;
    this.add(token, target);
  }

  add(token, target) {
    PropertyTargetManager.getOrCreate(target).setProperty(token.cssCustomProperty, this.resolveCSSValue(DesignTokenNode.getOrCreate(target).get(token)));
  }

  remove(token, target) {
    PropertyTargetManager.getOrCreate(target).removeProperty(token.cssCustomProperty);
  }

  resolveCSSValue(value) {
    return value && typeof value.createCSS === "function" ? value.createCSS() : value;
  }

}
/**
 * A light wrapper around BindingObserver to handle value caching and
 * token notification
 */


class DesignTokenBindingObserver {
  constructor(source, token, node) {
    this.source = source;
    this.token = token;
    this.node = node;
    this.dependencies = new Set();
    this.observer = Observable.binding(source, this, false); // This is a little bit hacky because it's using internal APIs of BindingObserverImpl.
    // BindingObserverImpl queues updates to batch it's notifications which doesn't work for this
    // scenario because the DesignToken.getValueFor API is not async. Without this, using DesignToken.getValueFor()
    // after DesignToken.setValueFor() when setting a dependency of the value being retrieved can return a stale
    // value. Assigning .handleChange to .call forces immediate invocation of this classes handleChange() method,
    // allowing resolution of values synchronously.
    // TODO: https://github.com/microsoft/fast/issues/5110

    this.observer.handleChange = this.observer.call;
    this.handleChange();
  }

  disconnect() {
    this.observer.disconnect();
  }
  /**
   * @internal
   */


  handleChange() {
    this.node.store.set(this.token, this.observer.observe(this.node.target, defaultExecutionContext));
  }

}
/**
 * Stores resolved token/value pairs and notifies on changes
 */


class Store {
  constructor() {
    this.values = new Map();
  }

  set(token, value) {
    if (this.values.get(token) !== value) {
      this.values.set(token, value);
      Observable.getNotifier(this).notify(token.id);
    }
  }

  get(token) {
    Observable.track(this, token.id);
    return this.values.get(token);
  }

  delete(token) {
    this.values.delete(token);
  }

  all() {
    return this.values.entries();
  }

}

const nodeCache = new WeakMap();
const childToParent = new WeakMap();
/**
 * A node responsible for setting and getting token values,
 * emitting values to CSS custom properties, and maintaining
 * inheritance structures.
 */

class DesignTokenNode {
  constructor(target) {
    this.target = target;
    /**
     * Stores all resolved token values for a node
     */

    this.store = new Store();
    /**
     * All children assigned to the node
     */

    this.children = [];
    /**
     * All values explicitly assigned to the node in their raw form
     */

    this.assignedValues = new Map();
    /**
     * Tokens currently being reflected to CSS custom properties
     */

    this.reflecting = new Set();
    /**
     * Binding observers for assigned and inherited derived values.
     */

    this.bindingObservers = new Map();
    /**
     * Emits notifications to token when token values
     * change the DesignTokenNode
     */

    this.tokenValueChangeHandler = {
      handleChange: (source, arg) => {
        const token = DesignTokenImpl.getTokenById(arg);

        if (token) {
          // Notify any token subscribers
          token.notify(this.target);

          if (DesignTokenImpl.isCSSDesignToken(token)) {
            const parent = this.parent;
            const reflecting = this.isReflecting(token);

            if (parent) {
              const parentValue = parent.get(token);
              const sourceValue = source.get(token);

              if (parentValue !== sourceValue && !reflecting) {
                this.reflectToCSS(token);
              } else if (parentValue === sourceValue && reflecting) {
                this.stopReflectToCSS(token);
              }
            } else if (!reflecting) {
              this.reflectToCSS(token);
            }
          }
        }
      }
    };
    nodeCache.set(target, this); // Map store change notifications to token change notifications

    Observable.getNotifier(this.store).subscribe(this.tokenValueChangeHandler);

    if (target instanceof FASTElement) {
      target.$fastController.addBehaviors([this]);
    } else if (target.isConnected) {
      this.bind();
    }
  }
  /**
   * Returns a DesignTokenNode for an element.
   * Creates a new instance if one does not already exist for a node,
   * otherwise returns the cached instance
   *
   * @param target - The HTML element to retrieve a DesignTokenNode for
   */


  static getOrCreate(target) {
    return nodeCache.get(target) || new DesignTokenNode(target);
  }
  /**
   * Determines if a DesignTokenNode has been created for a target
   * @param target - The element to test
   */


  static existsFor(target) {
    return nodeCache.has(target);
  }
  /**
   * Searches for and return the nearest parent DesignTokenNode.
   * Null is returned if no node is found or the node provided is for a default element.
   */


  static findParent(node) {
    if (!(defaultElement === node.target)) {
      let parent = composedParent(node.target);

      while (parent !== null) {
        if (nodeCache.has(parent)) {
          return nodeCache.get(parent);
        }

        parent = composedParent(parent);
      }

      return DesignTokenNode.getOrCreate(defaultElement);
    }

    return null;
  }
  /**
   * Finds the closest node with a value explicitly assigned for a token, otherwise null.
   * @param token - The token to look for
   * @param start - The node to start looking for value assignment
   * @returns
   */


  static findClosestAssignedNode(token, start) {
    let current = start;

    do {
      if (current.has(token)) {
        return current;
      }

      current = current.parent ? current.parent : current.target !== defaultElement ? DesignTokenNode.getOrCreate(defaultElement) : null;
    } while (current !== null);

    return null;
  }
  /**
   * The parent DesignTokenNode, or null.
   */


  get parent() {
    return childToParent.get(this) || null;
  }
  /**
   * Checks if a token has been assigned an explicit value the node.
   * @param token - the token to check.
   */


  has(token) {
    return this.assignedValues.has(token);
  }
  /**
   * Gets the value of a token for a node
   * @param token - The token to retrieve the value for
   * @returns
   */


  get(token) {
    const value = this.store.get(token);

    if (value !== undefined) {
      return value;
    }

    const raw = this.getRaw(token);

    if (raw !== undefined) {
      this.hydrate(token, raw);
      return this.get(token);
    }
  }
  /**
   * Retrieves the raw assigned value of a token from the nearest assigned node.
   * @param token - The token to retrieve a raw value for
   * @returns
   */


  getRaw(token) {
    var _a;

    if (this.assignedValues.has(token)) {
      return this.assignedValues.get(token);
    }

    return (_a = DesignTokenNode.findClosestAssignedNode(token, this)) === null || _a === void 0 ? void 0 : _a.getRaw(token);
  }
  /**
   * Sets a token to a value for a node
   * @param token - The token to set
   * @param value - The value to set the token to
   */


  set(token, value) {
    if (DesignTokenImpl.isDerivedDesignTokenValue(this.assignedValues.get(token))) {
      this.tearDownBindingObserver(token);
    }

    this.assignedValues.set(token, value);

    if (DesignTokenImpl.isDerivedDesignTokenValue(value)) {
      this.setupBindingObserver(token, value);
    } else {
      this.store.set(token, value);
    }
  }
  /**
   * Deletes a token value for the node.
   * @param token - The token to delete the value for
   */


  delete(token) {
    this.assignedValues.delete(token);
    this.tearDownBindingObserver(token);
    const upstream = this.getRaw(token);

    if (upstream) {
      this.hydrate(token, upstream);
    } else {
      this.store.delete(token);
    }
  }
  /**
   * Invoked when the DesignTokenNode.target is attached to the document
   */


  bind() {
    const parent = DesignTokenNode.findParent(this);

    if (parent) {
      parent.appendChild(this);
    }

    for (const key of this.assignedValues.keys()) {
      key.notify(this.target);
    }
  }
  /**
   * Invoked when the DesignTokenNode.target is detached from the document
   */


  unbind() {
    if (this.parent) {
      const parent = childToParent.get(this);
      parent.removeChild(this);
    }
  }
  /**
   * Appends a child to a parent DesignTokenNode.
   * @param child - The child to append to the node
   */


  appendChild(child) {
    if (child.parent) {
      childToParent.get(child).removeChild(child);
    }

    const reParent = this.children.filter(x => child.contains(x));
    childToParent.set(child, this);
    this.children.push(child);
    reParent.forEach(x => child.appendChild(x));
    Observable.getNotifier(this.store).subscribe(child); // How can we not notify *every* subscriber?

    for (const [token, value] of this.store.all()) {
      child.hydrate(token, this.bindingObservers.has(token) ? this.getRaw(token) : value);
    }
  }
  /**
   * Removes a child from a node.
   * @param child - The child to remove.
   */


  removeChild(child) {
    const childIndex = this.children.indexOf(child);

    if (childIndex !== -1) {
      this.children.splice(childIndex, 1);
    }

    Observable.getNotifier(this.store).unsubscribe(child);
    return child.parent === this ? childToParent.delete(child) : false;
  }
  /**
   * Tests whether a provided node is contained by
   * the calling node.
   * @param test - The node to test
   */


  contains(test) {
    return composedContains(this.target, test.target);
  }
  /**
   * Instructs the node to reflect a design token for the provided token.
   * @param token - The design token to reflect
   */


  reflectToCSS(token) {
    if (!this.isReflecting(token)) {
      this.reflecting.add(token);
      DesignTokenNode.cssCustomPropertyReflector.startReflection(token, this.target);
    }
  }
  /**
   * Stops reflecting a DesignToken to CSS
   * @param token - The design token to stop reflecting
   */


  stopReflectToCSS(token) {
    if (this.isReflecting(token)) {
      this.reflecting.delete(token);
      DesignTokenNode.cssCustomPropertyReflector.stopReflection(token, this.target);
    }
  }
  /**
   * Determines if a token is being reflected to CSS for a node.
   * @param token - The token to check for reflection
   * @returns
   */


  isReflecting(token) {
    return this.reflecting.has(token);
  }
  /**
   * Handle changes to upstream tokens
   * @param source - The parent DesignTokenNode
   * @param property - The token ID that changed
   */


  handleChange(source, property) {
    const token = DesignTokenImpl.getTokenById(property);

    if (!token) {
      return;
    }

    this.hydrate(token, this.getRaw(token));
  }
  /**
   * Hydrates a token with a DesignTokenValue, making retrieval available.
   * @param token - The token to hydrate
   * @param value - The value to hydrate
   */


  hydrate(token, value) {
    if (!this.has(token)) {
      const observer = this.bindingObservers.get(token);

      if (DesignTokenImpl.isDerivedDesignTokenValue(value)) {
        if (observer) {
          // If the binding source doesn't match, we need
          // to update the binding
          if (observer.source !== value) {
            this.tearDownBindingObserver(token);
            this.setupBindingObserver(token, value);
          }
        } else {
          this.setupBindingObserver(token, value);
        }
      } else {
        if (observer) {
          this.tearDownBindingObserver(token);
        }

        this.store.set(token, value);
      }
    }
  }
  /**
   * Sets up a binding observer for a derived token value that notifies token
   * subscribers on change.
   *
   * @param token - The token to notify when the binding updates
   * @param source - The binding source
   */


  setupBindingObserver(token, source) {
    const binding = new DesignTokenBindingObserver(source, token, this);
    this.bindingObservers.set(token, binding);
    return binding;
  }
  /**
   * Tear down a binding observer for a token.
   */


  tearDownBindingObserver(token) {
    if (this.bindingObservers.has(token)) {
      this.bindingObservers.get(token).disconnect();
      this.bindingObservers.delete(token);
      return true;
    }

    return false;
  }

}
/**
 * Responsible for reflecting tokens to CSS custom properties
 */


DesignTokenNode.cssCustomPropertyReflector = new CustomPropertyReflector();

__decorate([observable], DesignTokenNode.prototype, "children", void 0);

function create(nameOrConfig) {
  return DesignTokenImpl.from(nameOrConfig);
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Factory object for creating {@link (DesignToken:interface)} instances.
 * @public
 */


const DesignToken = Object.freeze({
  create,

  /**
   * Informs DesignToken that an HTMLElement for which tokens have
   * been set has been connected to the document.
   *
   * The browser does not provide a reliable mechanism to observe an HTMLElement's connectedness
   * in all scenarios, so invoking this method manually is necessary when:
   *
   * 1. Token values are set for an HTMLElement.
   * 2. The HTMLElement does not inherit from FASTElement.
   * 3. The HTMLElement is not connected to the document when token values are set.
   *
   * @param element - The element to notify
   * @returns - true if notification was successful, otherwise false.
   */
  notifyConnection(element) {
    if (!element.isConnected || !DesignTokenNode.existsFor(element)) {
      return false;
    }

    DesignTokenNode.getOrCreate(element).bind();
    return true;
  },

  /**
   * Informs DesignToken that an HTMLElement for which tokens have
   * been set has been disconnected to the document.
   *
   * The browser does not provide a reliable mechanism to observe an HTMLElement's connectedness
   * in all scenarios, so invoking this method manually is necessary when:
   *
   * 1. Token values are set for an HTMLElement.
   * 2. The HTMLElement does not inherit from FASTElement.
   *
   * @param element - The element to notify
   * @returns - true if notification was successful, otherwise false.
   */
  notifyDisconnection(element) {
    if (element.isConnected || !DesignTokenNode.existsFor(element)) {
      return false;
    }

    DesignTokenNode.getOrCreate(element).unbind();
    return true;
  },

  /**
   * Registers and element or document as a DesignToken root.
   * {@link CSSDesignToken | CSSDesignTokens} with default values assigned via
   * {@link (DesignToken:interface).withDefault} will emit CSS custom properties to all
   * registered roots.
   * @param target - The root to register
   */
  registerRoot(target = defaultElement) {
    RootStyleSheetTarget.registerRoot(target);
  },

  /**
   * Unregister an element or document as a DesignToken root.
   * @param target - The root to deregister
   */
  unregisterRoot(target = defaultElement) {
    RootStyleSheetTarget.unregisterRoot(target);
  }

});
/* eslint-enable @typescript-eslint/no-non-null-assertion */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Indicates what to do with an ambiguous (duplicate) element.
 * @public
 */

const ElementDisambiguation = Object.freeze({
  /**
   * Skip defining the element but still call the provided callback passed
   * to DesignSystemRegistrationContext.tryDefineElement
   */
  definitionCallbackOnly: null,

  /**
   * Ignore the duplicate element entirely.
   */
  ignoreDuplicate: Symbol()
});
const elementTypesByTag = new Map();
const elementTagsByType = new Map();
let rootDesignSystem = null;
const designSystemKey = DI.createInterface(x => x.cachedCallback(handler => {
  if (rootDesignSystem === null) {
    rootDesignSystem = new DefaultDesignSystem(null, handler);
  }

  return rootDesignSystem;
}));
/**
 * An API gateway to design system features.
 * @public
 */

const DesignSystem = Object.freeze({
  /**
   * Returns the HTML element name that the type is defined as.
   * @param type - The type to lookup.
   * @public
   */
  tagFor(type) {
    return elementTagsByType.get(type);
  },

  /**
   * Searches the DOM hierarchy for the design system that is responsible
   * for the provided element.
   * @param element - The element to locate the design system for.
   * @returns The located design system.
   * @public
   */
  responsibleFor(element) {
    const owned = element.$$designSystem$$;

    if (owned) {
      return owned;
    }

    const container = DI.findResponsibleContainer(element);
    return container.get(designSystemKey);
  },

  /**
   * Gets the DesignSystem if one is explicitly defined on the provided element;
   * otherwise creates a design system defined directly on the element.
   * @param element - The element to get or create a design system for.
   * @returns The design system.
   * @public
   */
  getOrCreate(node) {
    if (!node) {
      if (rootDesignSystem === null) {
        rootDesignSystem = DI.getOrCreateDOMContainer().get(designSystemKey);
      }

      return rootDesignSystem;
    }

    const owned = node.$$designSystem$$;

    if (owned) {
      return owned;
    }

    const container = DI.getOrCreateDOMContainer(node);

    if (container.has(designSystemKey, false)) {
      return container.get(designSystemKey);
    } else {
      const system = new DefaultDesignSystem(node, container);
      container.register(Registration.instance(designSystemKey, system));
      return system;
    }
  }

});

function extractTryDefineElementParams(params, elementDefinitionType, elementDefinitionCallback) {
  if (typeof params === "string") {
    return {
      name: params,
      type: elementDefinitionType,
      callback: elementDefinitionCallback
    };
  } else {
    return params;
  }
}

class DefaultDesignSystem {
  constructor(owner, container) {
    this.owner = owner;
    this.container = container;
    this.designTokensInitialized = false;
    this.prefix = "fast";
    this.shadowRootMode = undefined;

    this.disambiguate = () => ElementDisambiguation.definitionCallbackOnly;

    if (owner !== null) {
      owner.$$designSystem$$ = this;
    }
  }

  withPrefix(prefix) {
    this.prefix = prefix;
    return this;
  }

  withShadowRootMode(mode) {
    this.shadowRootMode = mode;
    return this;
  }

  withElementDisambiguation(callback) {
    this.disambiguate = callback;
    return this;
  }

  withDesignTokenRoot(root) {
    this.designTokenRoot = root;
    return this;
  }

  register(...registrations) {
    const container = this.container;
    const elementDefinitionEntries = [];
    const disambiguate = this.disambiguate;
    const shadowRootMode = this.shadowRootMode;
    const context = {
      elementPrefix: this.prefix,

      tryDefineElement(params, elementDefinitionType, elementDefinitionCallback) {
        const extractedParams = extractTryDefineElementParams(params, elementDefinitionType, elementDefinitionCallback);
        const {
          name,
          callback,
          baseClass
        } = extractedParams;
        let {
          type
        } = extractedParams;
        let elementName = name;
        let typeFoundByName = elementTypesByTag.get(elementName);
        let needsDefine = true;

        while (typeFoundByName) {
          const result = disambiguate(elementName, type, typeFoundByName);

          switch (result) {
            case ElementDisambiguation.ignoreDuplicate:
              return;

            case ElementDisambiguation.definitionCallbackOnly:
              needsDefine = false;
              typeFoundByName = void 0;
              break;

            default:
              elementName = result;
              typeFoundByName = elementTypesByTag.get(elementName);
              break;
          }
        }

        if (needsDefine) {
          if (elementTagsByType.has(type) || type === FoundationElement) {
            type = class extends type {};
          }

          elementTypesByTag.set(elementName, type);
          elementTagsByType.set(type, elementName);

          if (baseClass) {
            elementTagsByType.set(baseClass, elementName);
          }
        }

        elementDefinitionEntries.push(new ElementDefinitionEntry(container, elementName, type, shadowRootMode, callback, needsDefine));
      }

    };

    if (!this.designTokensInitialized) {
      this.designTokensInitialized = true;

      if (this.designTokenRoot !== null) {
        DesignToken.registerRoot(this.designTokenRoot);
      }
    }

    container.registerWithContext(context, ...registrations);

    for (const entry of elementDefinitionEntries) {
      entry.callback(entry);

      if (entry.willDefine && entry.definition !== null) {
        entry.definition.define();
      }
    }

    return this;
  }

}

class ElementDefinitionEntry {
  constructor(container, name, type, shadowRootMode, callback, willDefine) {
    this.container = container;
    this.name = name;
    this.type = type;
    this.shadowRootMode = shadowRootMode;
    this.callback = callback;
    this.willDefine = willDefine;
    this.definition = null;
  }

  definePresentation(presentation) {
    ComponentPresentation.define(this.name, presentation, this.container);
  }

  defineElement(definition) {
    this.definition = new FASTElementDefinition(this.type, Object.assign(Object.assign({}, definition), {
      name: this.name
    }));
  }

  tagFor(type) {
    return DesignSystem.tagFor(type);
  }

}
/* eslint-enable @typescript-eslint/no-non-null-assertion */

/**
 * @internal
 */

class Button extends Button$1 {
  constructor() {
    super(...arguments);
    /**
     * The shape the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */

    this.shape = "rounded";
    /**
     * The size the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: shape
     */

    this.size = "medium";
    /**
     * The button can fill its space.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */

    this.block = false;
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */

    this.disabledFocusable = false;
  }
  /**
   * Applies 'icon-only' class when there is only an SVG in the default slot
   *
   * @public
   * @remarks
   */


  defaultSlottedContentChanged() {
    const slottedElements = this.defaultSlottedContent.filter(x => x.nodeType === Node.ELEMENT_NODE);

    if (slottedElements.length === 1 && slottedElements[0] instanceof SVGElement) {
      this.control.classList.add("icon-only");
    } else {
      this.control.classList.remove("icon-only");
    }
  }

}

__decorate([attr], Button.prototype, "appearance", void 0);

__decorate([attr], Button.prototype, "shape", void 0);

__decorate([attr], Button.prototype, "size", void 0);

__decorate([attr({
  mode: "boolean"
})], Button.prototype, "block", void 0);

__decorate([attr({
  attribute: "disabledfocusable",
  mode: "boolean"
})], Button.prototype, "disabledFocusable", void 0);

/**
 * The template for the {@link @microsoft/fast-foundation#(Button:class)} component.
 * @public
 */

const buttonTemplate$1 = (context, definition) => html`<button class="base" part="base" ?autofocus="${x => x.autofocus}" ?disabled="${x => x.disabled}" tabindex="${x => x.disabledFocusable ? "0" : !!x.tabIndex || void 0}" form="${x => x.formId}" formaction="${x => x.formaction}" formenctype="${x => x.formenctype}" formmethod="${x => x.formmethod}" formnovalidate="${x => x.formnovalidate}" formtarget="${x => x.formtarget}" name="${x => x.name}" type="${x => x.type}" value="${x => x.value}" aria-atomic="${x => x.ariaAtomic}" aria-busy="${x => x.ariaBusy}" aria-controls="${x => x.ariaControls}" aria-current="${x => x.ariaCurrent}" aria-describedby="${x => x.ariaDescribedby}" aria-details="${x => x.ariaDetails}" aria-disabled="${x => x.disabledFocusable === true ? "true" : x.ariaDisabled}" aria-errormessage="${x => x.ariaErrormessage}" aria-expanded="${x => x.ariaExpanded}" aria-flowto="${x => x.ariaFlowto}" aria-haspopup="${x => x.ariaHaspopup}" aria-hidden="${x => x.ariaHidden}" aria-invalid="${x => x.ariaInvalid}" aria-keyshortcuts="${x => x.ariaKeyshortcuts}" aria-label="${x => x.ariaLabel}" aria-labelledby="${x => x.ariaLabelledby}" aria-live="${x => x.ariaLive}" aria-owns="${x => x.ariaOwns}" aria-pressed="${x => x.ariaPressed}" aria-relevant="${x => x.ariaRelevant}" aria-roledescription="${x => x.ariaRoledescription}" ${ref("control")}>${startSlotTemplate(context, definition)}<slot ${slotted("defaultSlottedContent")}></slot>${endSlotTemplate(context, definition)}</button>`;

/**
 * Behavior that will conditionally apply a stylesheet based on the elements
 * appearance property
 *
 * @param value - The value of the appearance property
 * @param styles - The styles to be applied when condition matches
 *
 * @public
 */

function appearanceBehavior(value, styles) {
  return new PropertyStyleSheetBehavior("appearance", value, styles);
}

/**
 * Behavior that will conditionally apply a stylesheet based on the elements
 * size property
 *
 * @param value - The value of the size property
 * @param styles - The styles to be applied when condition matches
 *
 * @public
 */

function sizeBehavior(value, styles) {
  return new PropertyStyleSheetBehavior("size", value, styles);
}

const tokens = {
  // Color tokens
  colorNeutralForeground1: 'var(--colorNeutralForeground1)',
  colorNeutralForeground1Hover: 'var(--colorNeutralForeground1Hover)',
  colorNeutralForeground1Pressed: 'var(--colorNeutralForeground1Pressed)',
  colorNeutralForeground1Selected: 'var(--colorNeutralForeground1Selected)',
  colorNeutralForeground2: 'var(--colorNeutralForeground2)',
  colorNeutralForeground2Hover: 'var(--colorNeutralForeground2Hover)',
  colorNeutralForeground2Pressed: 'var(--colorNeutralForeground2Pressed)',
  colorNeutralForeground2Selected: 'var(--colorNeutralForeground2Selected)',
  colorNeutralForeground2BrandHover: 'var(--colorNeutralForeground2BrandHover)',
  colorNeutralForeground2BrandPressed: 'var(--colorNeutralForeground2BrandPressed)',
  colorNeutralForeground2BrandSelected: 'var(--colorNeutralForeground2BrandSelected)',
  colorNeutralForeground3: 'var(--colorNeutralForeground3)',
  colorNeutralForeground3Hover: 'var(--colorNeutralForeground3Hover)',
  colorNeutralForeground3Pressed: 'var(--colorNeutralForeground3Pressed)',
  colorNeutralForeground3Selected: 'var(--colorNeutralForeground3Selected)',
  colorNeutralForeground3BrandHover: 'var(--colorNeutralForeground3BrandHover)',
  colorNeutralForeground3BrandPressed: 'var(--colorNeutralForeground3BrandPressed)',
  colorNeutralForeground3BrandSelected: 'var(--colorNeutralForeground3BrandSelected)',
  colorNeutralForeground4: 'var(--colorNeutralForeground4)',
  colorNeutralForegroundDisabled: 'var(--colorNeutralForegroundDisabled)',
  colorBrandForegroundLink: 'var(--colorBrandForegroundLink)',
  colorBrandForegroundLinkHover: 'var(--colorBrandForegroundLinkHover)',
  colorBrandForegroundLinkPressed: 'var(--colorBrandForegroundLinkPressed)',
  colorBrandForegroundLinkSelected: 'var(--colorBrandForegroundLinkSelected)',
  colorCompoundBrandForeground1: 'var(--colorCompoundBrandForeground1)',
  colorCompoundBrandForeground1Hover: 'var(--colorCompoundBrandForeground1Hover)',
  colorCompoundBrandForeground1Pressed: 'var(--colorCompoundBrandForeground1Pressed)',
  colorNeutralForegroundOnBrand: 'var(--colorNeutralForegroundOnBrand)',
  colorNeutralForegroundInverted: 'var(--colorNeutralForegroundInverted)',
  colorNeutralForegroundInvertedHover: 'var(--colorNeutralForegroundInvertedHover)',
  colorNeutralForegroundInvertedPressed: 'var(--colorNeutralForegroundInvertedPressed)',
  colorNeutralForegroundInvertedSelected: 'var(--colorNeutralForegroundInvertedSelected)',
  colorNeutralForegroundInvertedLink: 'var(--colorNeutralForegroundInvertedLink)',
  colorNeutralForegroundInvertedLinkHover: 'var(--colorNeutralForegroundInvertedLinkHover)',
  colorNeutralForegroundInvertedLinkPressed: 'var(--colorNeutralForegroundInvertedLinkPressed)',
  colorNeutralForegroundInvertedLinkSelected: 'var(--colorNeutralForegroundInvertedLinkSelected)',
  colorNeutralForegroundInvertedDisabled: 'var(--colorNeutralForegroundInvertedDisabled)',
  colorBrandForeground1: 'var(--colorBrandForeground1)',
  colorBrandForeground2: 'var(--colorBrandForeground2)',
  colorNeutralForeground1Static: 'var(--colorNeutralForeground1Static)',
  colorBrandForegroundInverted: 'var(--colorBrandForegroundInverted)',
  colorBrandForegroundInvertedHover: 'var(--colorBrandForegroundInvertedHover)',
  colorBrandForegroundInvertedPressed: 'var(--colorBrandForegroundInvertedPressed)',
  colorBrandForegroundOnLight: 'var(--colorBrandForegroundOnLight)',
  colorBrandForegroundOnLightHover: 'var(--colorBrandForegroundOnLightHover)',
  colorBrandForegroundOnLightPressed: 'var(--colorBrandForegroundOnLightPressed)',
  colorBrandForegroundOnLightSelected: 'var(--colorBrandForegroundOnLightSelected)',
  colorNeutralBackground1: 'var(--colorNeutralBackground1)',
  colorNeutralBackground1Hover: 'var(--colorNeutralBackground1Hover)',
  colorNeutralBackground1Pressed: 'var(--colorNeutralBackground1Pressed)',
  colorNeutralBackground1Selected: 'var(--colorNeutralBackground1Selected)',
  colorNeutralBackground2: 'var(--colorNeutralBackground2)',
  colorNeutralBackground2Hover: 'var(--colorNeutralBackground2Hover)',
  colorNeutralBackground2Pressed: 'var(--colorNeutralBackground2Pressed)',
  colorNeutralBackground2Selected: 'var(--colorNeutralBackground2Selected)',
  colorNeutralBackground3: 'var(--colorNeutralBackground3)',
  colorNeutralBackground3Hover: 'var(--colorNeutralBackground3Hover)',
  colorNeutralBackground3Pressed: 'var(--colorNeutralBackground3Pressed)',
  colorNeutralBackground3Selected: 'var(--colorNeutralBackground3Selected)',
  colorNeutralBackground4: 'var(--colorNeutralBackground4)',
  colorNeutralBackground4Hover: 'var(--colorNeutralBackground4Hover)',
  colorNeutralBackground4Pressed: 'var(--colorNeutralBackground4Pressed)',
  colorNeutralBackground4Selected: 'var(--colorNeutralBackground4Selected)',
  colorNeutralBackground5: 'var(--colorNeutralBackground5)',
  colorNeutralBackground5Hover: 'var(--colorNeutralBackground5Hover)',
  colorNeutralBackground5Pressed: 'var(--colorNeutralBackground5Pressed)',
  colorNeutralBackground5Selected: 'var(--colorNeutralBackground5Selected)',
  colorNeutralBackground6: 'var(--colorNeutralBackground6)',
  colorNeutralBackgroundInverted: 'var(--colorNeutralBackgroundInverted)',
  colorSubtleBackground: 'var(--colorSubtleBackground)',
  colorSubtleBackgroundHover: 'var(--colorSubtleBackgroundHover)',
  colorSubtleBackgroundPressed: 'var(--colorSubtleBackgroundPressed)',
  colorSubtleBackgroundSelected: 'var(--colorSubtleBackgroundSelected)',
  colorSubtleBackgroundLightAlphaHover: 'var(--colorSubtleBackgroundLightAlphaHover)',
  colorSubtleBackgroundLightAlphaPressed: 'var(--colorSubtleBackgroundLightAlphaPressed)',
  colorSubtleBackgroundLightAlphaSelected: 'var(--colorSubtleBackgroundLightAlphaSelected)',
  colorSubtleBackgroundInverted: 'var(--colorSubtleBackgroundInverted)',
  colorSubtleBackgroundInvertedHover: 'var(--colorSubtleBackgroundInvertedHover)',
  colorSubtleBackgroundInvertedPressed: 'var(--colorSubtleBackgroundInvertedPressed)',
  colorSubtleBackgroundInvertedSelected: 'var(--colorSubtleBackgroundInvertedSelected)',
  colorTransparentBackground: 'var(--colorTransparentBackground)',
  colorTransparentBackgroundHover: 'var(--colorTransparentBackgroundHover)',
  colorTransparentBackgroundPressed: 'var(--colorTransparentBackgroundPressed)',
  colorTransparentBackgroundSelected: 'var(--colorTransparentBackgroundSelected)',
  colorNeutralBackgroundDisabled: 'var(--colorNeutralBackgroundDisabled)',
  colorNeutralBackgroundInvertedDisabled: 'var(--colorNeutralBackgroundInvertedDisabled)',
  colorNeutralStencil1: 'var(--colorNeutralStencil1)',
  colorNeutralStencil2: 'var(--colorNeutralStencil2)',
  colorBrandBackground: 'var(--colorBrandBackground)',
  colorBrandBackgroundHover: 'var(--colorBrandBackgroundHover)',
  colorBrandBackgroundPressed: 'var(--colorBrandBackgroundPressed)',
  colorBrandBackgroundSelected: 'var(--colorBrandBackgroundSelected)',
  colorCompoundBrandBackground: 'var(--colorCompoundBrandBackground)',
  colorCompoundBrandBackgroundHover: 'var(--colorCompoundBrandBackgroundHover)',
  colorCompoundBrandBackgroundPressed: 'var(--colorCompoundBrandBackgroundPressed)',
  colorBrandBackgroundStatic: 'var(--colorBrandBackgroundStatic)',
  colorBrandBackground2: 'var(--colorBrandBackground2)',
  colorBrandBackgroundInverted: 'var(--colorBrandBackgroundInverted)',
  colorBrandBackgroundInvertedHover: 'var(--colorBrandBackgroundInvertedHover)',
  colorBrandBackgroundInvertedPressed: 'var(--colorBrandBackgroundInvertedPressed)',
  colorBrandBackgroundInvertedSelected: 'var(--colorBrandBackgroundInvertedSelected)',
  colorNeutralStrokeAccessible: 'var(--colorNeutralStrokeAccessible)',
  colorNeutralStrokeAccessibleHover: 'var(--colorNeutralStrokeAccessibleHover)',
  colorNeutralStrokeAccessiblePressed: 'var(--colorNeutralStrokeAccessiblePressed)',
  colorNeutralStrokeAccessibleSelected: 'var(--colorNeutralStrokeAccessibleSelected)',
  colorNeutralStroke1: 'var(--colorNeutralStroke1)',
  colorNeutralStroke1Hover: 'var(--colorNeutralStroke1Hover)',
  colorNeutralStroke1Pressed: 'var(--colorNeutralStroke1Pressed)',
  colorNeutralStroke1Selected: 'var(--colorNeutralStroke1Selected)',
  colorNeutralStroke2: 'var(--colorNeutralStroke2)',
  colorNeutralStroke3: 'var(--colorNeutralStroke3)',
  colorNeutralStrokeOnBrand: 'var(--colorNeutralStrokeOnBrand)',
  colorNeutralStrokeOnBrand2: 'var(--colorNeutralStrokeOnBrand2)',
  colorNeutralStrokeOnBrand2Hover: 'var(--colorNeutralStrokeOnBrand2Hover)',
  colorNeutralStrokeOnBrand2Pressed: 'var(--colorNeutralStrokeOnBrand2Pressed)',
  colorNeutralStrokeOnBrand2Selected: 'var(--colorNeutralStrokeOnBrand2Selected)',
  colorBrandStroke1: 'var(--colorBrandStroke1)',
  colorBrandStroke2: 'var(--colorBrandStroke2)',
  colorCompoundBrandStroke: 'var(--colorCompoundBrandStroke)',
  colorCompoundBrandStrokeHover: 'var(--colorCompoundBrandStrokeHover)',
  colorCompoundBrandStrokePressed: 'var(--colorCompoundBrandStrokePressed)',
  colorNeutralStrokeDisabled: 'var(--colorNeutralStrokeDisabled)',
  colorNeutralStrokeInvertedDisabled: 'var(--colorNeutralStrokeInvertedDisabled)',
  colorTransparentStroke: 'var(--colorTransparentStroke)',
  colorTransparentStrokeInteractive: 'var(--colorTransparentStrokeInteractive)',
  colorTransparentStrokeDisabled: 'var(--colorTransparentStrokeDisabled)',
  colorStrokeFocus1: 'var(--colorStrokeFocus1)',
  colorStrokeFocus2: 'var(--colorStrokeFocus2)',
  colorNeutralShadowAmbient: 'var(--colorNeutralShadowAmbient)',
  colorNeutralShadowKey: 'var(--colorNeutralShadowKey)',
  colorNeutralShadowAmbientLighter: 'var(--colorNeutralShadowAmbientLighter)',
  colorNeutralShadowKeyLighter: 'var(--colorNeutralShadowKeyLighter)',
  colorNeutralShadowAmbientDarker: 'var(--colorNeutralShadowAmbientDarker)',
  colorNeutralShadowKeyDarker: 'var(--colorNeutralShadowKeyDarker)',
  colorBrandShadowAmbient: 'var(--colorBrandShadowAmbient)',
  colorBrandShadowKey: 'var(--colorBrandShadowKey)',
  // Color palette tokens
  // Color palette anchor tokens
  colorPaletteAnchorBackground1: 'var(--colorPaletteAnchorBackground1)',
  colorPaletteAnchorBackground2: 'var(--colorPaletteAnchorBackground2)',
  colorPaletteAnchorBackground3: 'var(--colorPaletteAnchorBackground3)',
  colorPaletteAnchorBorderActive: 'var(--colorPaletteAnchorBorderActive)',
  colorPaletteAnchorBorder1: 'var(--colorPaletteAnchorBorder1)',
  colorPaletteAnchorBorder2: 'var(--colorPaletteAnchorBorder2)',
  colorPaletteAnchorForeground1: 'var(--colorPaletteAnchorForeground1)',
  colorPaletteAnchorForeground2: 'var(--colorPaletteAnchorForeground2)',
  colorPaletteAnchorForeground3: 'var(--colorPaletteAnchorForeground3)',
  // Color palette beige tokens
  colorPaletteBeigeBackground1: 'var(--colorPaletteBeigeBackground1)',
  colorPaletteBeigeBackground2: 'var(--colorPaletteBeigeBackground2)',
  colorPaletteBeigeBackground3: 'var(--colorPaletteBeigeBackground3)',
  colorPaletteBeigeBorderActive: 'var(--colorPaletteBeigeBorderActive)',
  colorPaletteBeigeBorder1: 'var(--colorPaletteBeigeBorder1)',
  colorPaletteBeigeBorder2: 'var(--colorPaletteBeigeBorder2)',
  colorPaletteBeigeForeground1: 'var(--colorPaletteBeigeForeground1)',
  colorPaletteBeigeForeground2: 'var(--colorPaletteBeigeForeground2)',
  colorPaletteBeigeForeground3: 'var(--colorPaletteBeigeForeground3)',
  // Color palette berry tokens
  colorPaletteBerryBackground1: 'var(--colorPaletteBerryBackground1)',
  colorPaletteBerryBackground2: 'var(--colorPaletteBerryBackground2)',
  colorPaletteBerryBackground3: 'var(--colorPaletteBerryBackground3)',
  colorPaletteBerryBorderActive: 'var(--colorPaletteBerryBorderActive)',
  colorPaletteBerryBorder1: 'var(--colorPaletteBerryBorder1)',
  colorPaletteBerryBorder2: 'var(--colorPaletteBerryBorder2)',
  colorPaletteBerryForeground1: 'var(--colorPaletteBerryForeground1)',
  colorPaletteBerryForeground2: 'var(--colorPaletteBerryForeground2)',
  colorPaletteBerryForeground3: 'var(--colorPaletteBerryForeground3)',
  // Color palette blue tokens
  colorPaletteBlueBackground1: 'var(--colorPaletteBlueBackground1)',
  colorPaletteBlueBackground2: 'var(--colorPaletteBlueBackground2)',
  colorPaletteBlueBackground3: 'var(--colorPaletteBlueBackground3)',
  colorPaletteBlueBorderActive: 'var(--colorPaletteBlueBorderActive)',
  colorPaletteBlueBorder1: 'var(--colorPaletteBlueBorder1)',
  colorPaletteBlueBorder2: 'var(--colorPaletteBlueBorder2)',
  colorPaletteBlueForeground1: 'var(--colorPaletteBlueForeground1)',
  colorPaletteBlueForeground2: 'var(--colorPaletteBlueForeground2)',
  colorPaletteBlueForeground3: 'var(--colorPaletteBlueForeground3)',
  // Color palette brass tokens
  colorPaletteBrassBackground1: 'var(--colorPaletteBrassBackground1)',
  colorPaletteBrassBackground2: 'var(--colorPaletteBrassBackground2)',
  colorPaletteBrassBackground3: 'var(--colorPaletteBrassBackground3)',
  colorPaletteBrassBorderActive: 'var(--colorPaletteBrassBorderActive)',
  colorPaletteBrassBorder1: 'var(--colorPaletteBrassBorder1)',
  colorPaletteBrassBorder2: 'var(--colorPaletteBrassBorder2)',
  colorPaletteBrassForeground1: 'var(--colorPaletteBrassForeground1)',
  colorPaletteBrassForeground2: 'var(--colorPaletteBrassForeground2)',
  colorPaletteBrassForeground3: 'var(--colorPaletteBrassForeground3)',
  // Color palette bronze tokens
  colorPaletteBronzeBackground1: 'var(--colorPaletteBronzeBackground1)',
  colorPaletteBronzeBackground2: 'var(--colorPaletteBronzeBackground2)',
  colorPaletteBronzeBackground3: 'var(--colorPaletteBronzeBackground3)',
  colorPaletteBronzeBorderActive: 'var(--colorPaletteBronzeBorderActive)',
  colorPaletteBronzeBorder1: 'var(--colorPaletteBronzeBorder1)',
  colorPaletteBronzeBorder2: 'var(--colorPaletteBronzeBorder2)',
  colorPaletteBronzeForeground1: 'var(--colorPaletteBronzeForeground1)',
  colorPaletteBronzeForeground2: 'var(--colorPaletteBronzeForeground2)',
  colorPaletteBronzeForeground3: 'var(--colorPaletteBronzeForeground3)',
  // Color palette brown tokens
  colorPaletteBrownBackground1: 'var(--colorPaletteBrownBackground1)',
  colorPaletteBrownBackground2: 'var(--colorPaletteBrownBackground2)',
  colorPaletteBrownBackground3: 'var(--colorPaletteBrownBackground3)',
  colorPaletteBrownBorderActive: 'var(--colorPaletteBrownBorderActive)',
  colorPaletteBrownBorder1: 'var(--colorPaletteBrownBorder1)',
  colorPaletteBrownBorder2: 'var(--colorPaletteBrownBorder2)',
  colorPaletteBrownForeground1: 'var(--colorPaletteBrownForeground1)',
  colorPaletteBrownForeground2: 'var(--colorPaletteBrownForeground2)',
  colorPaletteBrownForeground3: 'var(--colorPaletteBrownForeground3)',
  // Color palette burgundy tokens
  colorPaletteBurgundyBackground1: 'var(--colorPaletteBurgundyBackground1)',
  colorPaletteBurgundyBackground2: 'var(--colorPaletteBurgundyBackground2)',
  colorPaletteBurgundyBackground3: 'var(--colorPaletteBurgundyBackground3)',
  colorPaletteBurgundyBorderActive: 'var(--colorPaletteBurgundyBorderActive)',
  colorPaletteBurgundyBorder1: 'var(--colorPaletteBurgundyBorder1)',
  colorPaletteBurgundyBorder2: 'var(--colorPaletteBurgundyBorder2)',
  colorPaletteBurgundyForeground1: 'var(--colorPaletteBurgundyForeground1)',
  colorPaletteBurgundyForeground2: 'var(--colorPaletteBurgundyForeground2)',
  colorPaletteBurgundyForeground3: 'var(--colorPaletteBurgundyForeground3)',
  // Color palette charcoal tokens
  colorPaletteCharcoalBackground1: 'var(--colorPaletteCharcoalBackground1)',
  colorPaletteCharcoalBackground2: 'var(--colorPaletteCharcoalBackground2)',
  colorPaletteCharcoalBackground3: 'var(--colorPaletteCharcoalBackground3)',
  colorPaletteCharcoalBorderActive: 'var(--colorPaletteCharcoalBorderActive)',
  colorPaletteCharcoalBorder1: 'var(--colorPaletteCharcoalBorder1)',
  colorPaletteCharcoalBorder2: 'var(--colorPaletteCharcoalBorder2)',
  colorPaletteCharcoalForeground1: 'var(--colorPaletteCharcoalForeground1)',
  colorPaletteCharcoalForeground2: 'var(--colorPaletteCharcoalForeground2)',
  colorPaletteCharcoalForeground3: 'var(--colorPaletteCharcoalForeground3)',
  // Color palette cornflower tokens
  colorPaletteCornflowerBackground1: 'var(--colorPaletteCornflowerBackground1)',
  colorPaletteCornflowerBackground2: 'var(--colorPaletteCornflowerBackground2)',
  colorPaletteCornflowerBackground3: 'var(--colorPaletteCornflowerBackground3)',
  colorPaletteCornflowerBorderActive: 'var(--colorPaletteCornflowerBorderActive)',
  colorPaletteCornflowerBorder1: 'var(--colorPaletteCornflowerBorder1)',
  colorPaletteCornflowerBorder2: 'var(--colorPaletteCornflowerBorder2)',
  colorPaletteCornflowerForeground1: 'var(--colorPaletteCornflowerForeground1)',
  colorPaletteCornflowerForeground2: 'var(--colorPaletteCornflowerForeground2)',
  colorPaletteCornflowerForeground3: 'var(--colorPaletteCornflowerForeground3)',
  // Color palette cranberry tokens
  colorPaletteCranberryBackground1: 'var(--colorPaletteCranberryBackground1)',
  colorPaletteCranberryBackground2: 'var(--colorPaletteCranberryBackground2)',
  colorPaletteCranberryBackground3: 'var(--colorPaletteCranberryBackground3)',
  colorPaletteCranberryBorderActive: 'var(--colorPaletteCranberryBorderActive)',
  colorPaletteCranberryBorder1: 'var(--colorPaletteCranberryBorder1)',
  colorPaletteCranberryBorder2: 'var(--colorPaletteCranberryBorder2)',
  colorPaletteCranberryForeground1: 'var(--colorPaletteCranberryForeground1)',
  colorPaletteCranberryForeground2: 'var(--colorPaletteCranberryForeground2)',
  colorPaletteCranberryForeground3: 'var(--colorPaletteCranberryForeground3)',
  // Color palette cyan tokens
  colorPaletteCyanBackground1: 'var(--colorPaletteCyanBackground1)',
  colorPaletteCyanBackground2: 'var(--colorPaletteCyanBackground2)',
  colorPaletteCyanBackground3: 'var(--colorPaletteCyanBackground3)',
  colorPaletteCyanBorderActive: 'var(--colorPaletteCyanBorderActive)',
  colorPaletteCyanBorder1: 'var(--colorPaletteCyanBorder1)',
  colorPaletteCyanBorder2: 'var(--colorPaletteCyanBorder2)',
  colorPaletteCyanForeground1: 'var(--colorPaletteCyanForeground1)',
  colorPaletteCyanForeground2: 'var(--colorPaletteCyanForeground2)',
  colorPaletteCyanForeground3: 'var(--colorPaletteCyanForeground3)',
  // Color palette dark blue tokens
  colorPaletteDarkBlueBackground1: 'var(--colorPaletteDarkBlueBackground1)',
  colorPaletteDarkBlueBackground2: 'var(--colorPaletteDarkBlueBackground2)',
  colorPaletteDarkBlueBackground3: 'var(--colorPaletteDarkBlueBackground3)',
  colorPaletteDarkBlueBorderActive: 'var(--colorPaletteDarkBlueBorderActive)',
  colorPaletteDarkBlueBorder1: 'var(--colorPaletteDarkBlueBorder1)',
  colorPaletteDarkBlueBorder2: 'var(--colorPaletteDarkBlueBorder2)',
  colorPaletteDarkBlueForeground1: 'var(--colorPaletteDarkBlueForeground1)',
  colorPaletteDarkBlueForeground2: 'var(--colorPaletteDarkBlueForeground2)',
  colorPaletteDarkBlueForeground3: 'var(--colorPaletteDarkBlueForeground3)',
  // Color palette dark brown tokens
  colorPaletteDarkBrownBackground1: 'var(--colorPaletteDarkBrownBackground1)',
  colorPaletteDarkBrownBackground2: 'var(--colorPaletteDarkBrownBackground2)',
  colorPaletteDarkBrownBackground3: 'var(--colorPaletteDarkBrownBackground3)',
  colorPaletteDarkBrownBorderActive: 'var(--colorPaletteDarkBrownBorderActive)',
  colorPaletteDarkBrownBorder1: 'var(--colorPaletteDarkBrownBorder1)',
  colorPaletteDarkBrownBorder2: 'var(--colorPaletteDarkBrownBorder2)',
  colorPaletteDarkBrownForeground1: 'var(--colorPaletteDarkBrownForeground1)',
  colorPaletteDarkBrownForeground2: 'var(--colorPaletteDarkBrownForeground2)',
  colorPaletteDarkBrownForeground3: 'var(--colorPaletteDarkBrownForeground3)',
  // Color palette dark green tokens
  colorPaletteDarkGreenBackground1: 'var(--colorPaletteDarkGreenBackground1)',
  colorPaletteDarkGreenBackground2: 'var(--colorPaletteDarkGreenBackground2)',
  colorPaletteDarkGreenBackground3: 'var(--colorPaletteDarkGreenBackground3)',
  colorPaletteDarkGreenBorderActive: 'var(--colorPaletteDarkGreenBorderActive)',
  colorPaletteDarkGreenBorder1: 'var(--colorPaletteDarkGreenBorder1)',
  colorPaletteDarkGreenBorder2: 'var(--colorPaletteDarkGreenBorder2)',
  colorPaletteDarkGreenForeground1: 'var(--colorPaletteDarkGreenForeground1)',
  colorPaletteDarkGreenForeground2: 'var(--colorPaletteDarkGreenForeground2)',
  colorPaletteDarkGreenForeground3: 'var(--colorPaletteDarkGreenForeground3)',
  // Color palette dark orange tokens
  colorPaletteDarkOrangeBackground1: 'var(--colorPaletteDarkOrangeBackground1)',
  colorPaletteDarkOrangeBackground2: 'var(--colorPaletteDarkOrangeBackground2)',
  colorPaletteDarkOrangeBackground3: 'var(--colorPaletteDarkOrangeBackground3)',
  colorPaletteDarkOrangeBorderActive: 'var(--colorPaletteDarkOrangeBorderActive)',
  colorPaletteDarkOrangeBorder1: 'var(--colorPaletteDarkOrangeBorder1)',
  colorPaletteDarkOrangeBorder2: 'var(--colorPaletteDarkOrangeBorder2)',
  colorPaletteDarkOrangeForeground1: 'var(--colorPaletteDarkOrangeForeground1)',
  colorPaletteDarkOrangeForeground2: 'var(--colorPaletteDarkOrangeForeground2)',
  colorPaletteDarkOrangeForeground3: 'var(--colorPaletteDarkOrangeForeground3)',
  // Color palette dark purple tokens
  colorPaletteDarkPurpleBackground1: 'var(--colorPaletteDarkPurpleBackground1)',
  colorPaletteDarkPurpleBackground2: 'var(--colorPaletteDarkPurpleBackground2)',
  colorPaletteDarkPurpleBackground3: 'var(--colorPaletteDarkPurpleBackground3)',
  colorPaletteDarkPurpleBorderActive: 'var(--colorPaletteDarkPurpleBorderActive)',
  colorPaletteDarkPurpleBorder1: 'var(--colorPaletteDarkPurpleBorder1)',
  colorPaletteDarkPurpleBorder2: 'var(--colorPaletteDarkPurpleBorder2)',
  colorPaletteDarkPurpleForeground1: 'var(--colorPaletteDarkPurpleForeground1)',
  colorPaletteDarkPurpleForeground2: 'var(--colorPaletteDarkPurpleForeground2)',
  colorPaletteDarkPurpleForeground3: 'var(--colorPaletteDarkPurpleForeground3)',
  // Color palette dark red tokens
  colorPaletteDarkRedBackground1: 'var(--colorPaletteDarkRedBackground1)',
  colorPaletteDarkRedBackground2: 'var(--colorPaletteDarkRedBackground2)',
  colorPaletteDarkRedBackground3: 'var(--colorPaletteDarkRedBackground3)',
  colorPaletteDarkRedBorderActive: 'var(--colorPaletteDarkRedBorderActive)',
  colorPaletteDarkRedBorder1: 'var(--colorPaletteDarkRedBorder1)',
  colorPaletteDarkRedBorder2: 'var(--colorPaletteDarkRedBorder2)',
  colorPaletteDarkRedForeground1: 'var(--colorPaletteDarkRedForeground1)',
  colorPaletteDarkRedForeground2: 'var(--colorPaletteDarkRedForeground2)',
  colorPaletteDarkRedForeground3: 'var(--colorPaletteDarkRedForeground3)',
  // Color palette dark teal tokens
  colorPaletteDarkTealBackground1: 'var(--colorPaletteDarkTealBackground1)',
  colorPaletteDarkTealBackground2: 'var(--colorPaletteDarkTealBackground2)',
  colorPaletteDarkTealBackground3: 'var(--colorPaletteDarkTealBackground3)',
  colorPaletteDarkTealBorderActive: 'var(--colorPaletteDarkTealBorderActive)',
  colorPaletteDarkTealBorder1: 'var(--colorPaletteDarkTealBorder1)',
  colorPaletteDarkTealBorder2: 'var(--colorPaletteDarkTealBorder2)',
  colorPaletteDarkTealForeground1: 'var(--colorPaletteDarkTealForeground1)',
  colorPaletteDarkTealForeground2: 'var(--colorPaletteDarkTealForeground2)',
  colorPaletteDarkTealForeground3: 'var(--colorPaletteDarkTealForeground3)',
  // Color palette forest tokens
  colorPaletteForestBackground1: 'var(--colorPaletteForestBackground1)',
  colorPaletteForestBackground2: 'var(--colorPaletteForestBackground2)',
  colorPaletteForestBackground3: 'var(--colorPaletteForestBackground3)',
  colorPaletteForestBorderActive: 'var(--colorPaletteForestBorderActive)',
  colorPaletteForestBorder1: 'var(--colorPaletteForestBorder1)',
  colorPaletteForestBorder2: 'var(--colorPaletteForestBorder2)',
  colorPaletteForestForeground1: 'var(--colorPaletteForestForeground1)',
  colorPaletteForestForeground2: 'var(--colorPaletteForestForeground2)',
  colorPaletteForestForeground3: 'var(--colorPaletteForestForeground3)',
  // Color palette gold tokens
  colorPaletteGoldBackground1: 'var(--colorPaletteGoldBackground1)',
  colorPaletteGoldBackground2: 'var(--colorPaletteGoldBackground2)',
  colorPaletteGoldBackground3: 'var(--colorPaletteGoldBackground3)',
  colorPaletteGoldBorderActive: 'var(--colorPaletteGoldBorderActive)',
  colorPaletteGoldBorder1: 'var(--colorPaletteGoldBorder1)',
  colorPaletteGoldBorder2: 'var(--colorPaletteGoldBorder2)',
  colorPaletteGoldForeground1: 'var(--colorPaletteGoldForeground1)',
  colorPaletteGoldForeground2: 'var(--colorPaletteGoldForeground2)',
  colorPaletteGoldForeground3: 'var(--colorPaletteGoldForeground3)',
  // Color palette grape tokens
  colorPaletteGrapeBackground1: 'var(--colorPaletteGrapeBackground1)',
  colorPaletteGrapeBackground2: 'var(--colorPaletteGrapeBackground2)',
  colorPaletteGrapeBackground3: 'var(--colorPaletteGrapeBackground3)',
  colorPaletteGrapeBorderActive: 'var(--colorPaletteGrapeBorderActive)',
  colorPaletteGrapeBorder1: 'var(--colorPaletteGrapeBorder1)',
  colorPaletteGrapeBorder2: 'var(--colorPaletteGrapeBorder2)',
  colorPaletteGrapeForeground1: 'var(--colorPaletteGrapeForeground1)',
  colorPaletteGrapeForeground2: 'var(--colorPaletteGrapeForeground2)',
  colorPaletteGrapeForeground3: 'var(--colorPaletteGrapeForeground3)',
  // Color palette green tokens
  colorPaletteGreenBackground1: 'var(--colorPaletteGreenBackground1)',
  colorPaletteGreenBackground2: 'var(--colorPaletteGreenBackground2)',
  colorPaletteGreenBackground3: 'var(--colorPaletteGreenBackground3)',
  colorPaletteGreenBorderActive: 'var(--colorPaletteGreenBorderActive)',
  colorPaletteGreenBorder1: 'var(--colorPaletteGreenBorder1)',
  colorPaletteGreenBorder2: 'var(--colorPaletteGreenBorder2)',
  colorPaletteGreenForeground1: 'var(--colorPaletteGreenForeground1)',
  colorPaletteGreenForeground2: 'var(--colorPaletteGreenForeground2)',
  colorPaletteGreenForeground3: 'var(--colorPaletteGreenForeground3)',
  // Color palette hot pink tokens
  colorPaletteHotPinkBackground1: 'var(--colorPaletteHotPinkBackground1)',
  colorPaletteHotPinkBackground2: 'var(--colorPaletteHotPinkBackground2)',
  colorPaletteHotPinkBackground3: 'var(--colorPaletteHotPinkBackground3)',
  colorPaletteHotPinkBorderActive: 'var(--colorPaletteHotPinkBorderActive)',
  colorPaletteHotPinkBorder1: 'var(--colorPaletteHotPinkBorder1)',
  colorPaletteHotPinkBorder2: 'var(--colorPaletteHotPinkBorder2)',
  colorPaletteHotPinkForeground1: 'var(--colorPaletteHotPinkForeground1)',
  colorPaletteHotPinkForeground2: 'var(--colorPaletteHotPinkForeground2)',
  colorPaletteHotPinkForeground3: 'var(--colorPaletteHotPinkForeground3)',
  // Color palette lavender tokens
  colorPaletteLavenderBackground1: 'var(--colorPaletteLavenderBackground1)',
  colorPaletteLavenderBackground2: 'var(--colorPaletteLavenderBackground2)',
  colorPaletteLavenderBackground3: 'var(--colorPaletteLavenderBackground3)',
  colorPaletteLavenderBorderActive: 'var(--colorPaletteLavenderBorderActive)',
  colorPaletteLavenderBorder1: 'var(--colorPaletteLavenderBorder1)',
  colorPaletteLavenderBorder2: 'var(--colorPaletteLavenderBorder2)',
  colorPaletteLavenderForeground1: 'var(--colorPaletteLavenderForeground1)',
  colorPaletteLavenderForeground2: 'var(--colorPaletteLavenderForeground2)',
  colorPaletteLavenderForeground3: 'var(--colorPaletteLavenderForeground3)',
  // Color palette light blue tokens
  colorPaletteLightBlueBackground1: 'var(--colorPaletteLightBlueBackground1)',
  colorPaletteLightBlueBackground2: 'var(--colorPaletteLightBlueBackground2)',
  colorPaletteLightBlueBackground3: 'var(--colorPaletteLightBlueBackground3)',
  colorPaletteLightBlueBorderActive: 'var(--colorPaletteLightBlueBorderActive)',
  colorPaletteLightBlueBorder1: 'var(--colorPaletteLightBlueBorder1)',
  colorPaletteLightBlueBorder2: 'var(--colorPaletteLightBlueBorder2)',
  colorPaletteLightBlueForeground1: 'var(--colorPaletteLightBlueForeground1)',
  colorPaletteLightBlueForeground2: 'var(--colorPaletteLightBlueForeground2)',
  colorPaletteLightBlueForeground3: 'var(--colorPaletteLightBlueForeground3)',
  // Color palette light green tokens
  colorPaletteLightGreenBackground1: 'var(--colorPaletteLightGreenBackground1)',
  colorPaletteLightGreenBackground2: 'var(--colorPaletteLightGreenBackground2)',
  colorPaletteLightGreenBackground3: 'var(--colorPaletteLightGreenBackground3)',
  colorPaletteLightGreenBorderActive: 'var(--colorPaletteLightGreenBorderActive)',
  colorPaletteLightGreenBorder1: 'var(--colorPaletteLightGreenBorder1)',
  colorPaletteLightGreenBorder2: 'var(--colorPaletteLightGreenBorder2)',
  colorPaletteLightGreenForeground1: 'var(--colorPaletteLightGreenForeground1)',
  colorPaletteLightGreenForeground2: 'var(--colorPaletteLightGreenForeground2)',
  colorPaletteLightGreenForeground3: 'var(--colorPaletteLightGreenForeground3)',
  // Color palette light teal tokens
  colorPaletteLightTealBackground1: 'var(--colorPaletteLightTealBackground1)',
  colorPaletteLightTealBackground2: 'var(--colorPaletteLightTealBackground2)',
  colorPaletteLightTealBackground3: 'var(--colorPaletteLightTealBackground3)',
  colorPaletteLightTealBorderActive: 'var(--colorPaletteLightTealBorderActive)',
  colorPaletteLightTealBorder1: 'var(--colorPaletteLightTealBorder1)',
  colorPaletteLightTealBorder2: 'var(--colorPaletteLightTealBorder2)',
  colorPaletteLightTealForeground1: 'var(--colorPaletteLightTealForeground1)',
  colorPaletteLightTealForeground2: 'var(--colorPaletteLightTealForeground2)',
  colorPaletteLightTealForeground3: 'var(--colorPaletteLightTealForeground3)',
  // Color palette lilac tokens
  colorPaletteLilacBackground1: 'var(--colorPaletteLilacBackground1)',
  colorPaletteLilacBackground2: 'var(--colorPaletteLilacBackground2)',
  colorPaletteLilacBackground3: 'var(--colorPaletteLilacBackground3)',
  colorPaletteLilacBorderActive: 'var(--colorPaletteLilacBorderActive)',
  colorPaletteLilacBorder1: 'var(--colorPaletteLilacBorder1)',
  colorPaletteLilacBorder2: 'var(--colorPaletteLilacBorder2)',
  colorPaletteLilacForeground1: 'var(--colorPaletteLilacForeground1)',
  colorPaletteLilacForeground2: 'var(--colorPaletteLilacForeground2)',
  colorPaletteLilacForeground3: 'var(--colorPaletteLilacForeground3)',
  // Color palette lime tokens
  colorPaletteLimeBackground1: 'var(--colorPaletteLimeBackground1)',
  colorPaletteLimeBackground2: 'var(--colorPaletteLimeBackground2)',
  colorPaletteLimeBackground3: 'var(--colorPaletteLimeBackground3)',
  colorPaletteLimeBorderActive: 'var(--colorPaletteLimeBorderActive)',
  colorPaletteLimeBorder1: 'var(--colorPaletteLimeBorder1)',
  colorPaletteLimeBorder2: 'var(--colorPaletteLimeBorder2)',
  colorPaletteLimeForeground1: 'var(--colorPaletteLimeForeground1)',
  colorPaletteLimeForeground2: 'var(--colorPaletteLimeForeground2)',
  colorPaletteLimeForeground3: 'var(--colorPaletteLimeForeground3)',
  // Color palette magenta tokens
  colorPaletteMagentaBackground1: 'var(--colorPaletteMagentaBackground1)',
  colorPaletteMagentaBackground2: 'var(--colorPaletteMagentaBackground2)',
  colorPaletteMagentaBackground3: 'var(--colorPaletteMagentaBackground3)',
  colorPaletteMagentaBorderActive: 'var(--colorPaletteMagentaBorderActive)',
  colorPaletteMagentaBorder1: 'var(--colorPaletteMagentaBorder1)',
  colorPaletteMagentaBorder2: 'var(--colorPaletteMagentaBorder2)',
  colorPaletteMagentaForeground1: 'var(--colorPaletteMagentaForeground1)',
  colorPaletteMagentaForeground2: 'var(--colorPaletteMagentaForeground2)',
  colorPaletteMagentaForeground3: 'var(--colorPaletteMagentaForeground3)',
  // Color palette marigold tokens
  colorPaletteMarigoldBackground1: 'var(--colorPaletteMarigoldBackground1)',
  colorPaletteMarigoldBackground2: 'var(--colorPaletteMarigoldBackground2)',
  colorPaletteMarigoldBackground3: 'var(--colorPaletteMarigoldBackground3)',
  colorPaletteMarigoldBorderActive: 'var(--colorPaletteMarigoldBorderActive)',
  colorPaletteMarigoldBorder1: 'var(--colorPaletteMarigoldBorder1)',
  colorPaletteMarigoldBorder2: 'var(--colorPaletteMarigoldBorder2)',
  colorPaletteMarigoldForeground1: 'var(--colorPaletteMarigoldForeground1)',
  colorPaletteMarigoldForeground2: 'var(--colorPaletteMarigoldForeground2)',
  colorPaletteMarigoldForeground3: 'var(--colorPaletteMarigoldForeground3)',
  // Color palette mink tokens
  colorPaletteMinkBackground1: 'var(--colorPaletteMinkBackground1)',
  colorPaletteMinkBackground2: 'var(--colorPaletteMinkBackground2)',
  colorPaletteMinkBackground3: 'var(--colorPaletteMinkBackground3)',
  colorPaletteMinkBorderActive: 'var(--colorPaletteMinkBorderActive)',
  colorPaletteMinkBorder1: 'var(--colorPaletteMinkBorder1)',
  colorPaletteMinkBorder2: 'var(--colorPaletteMinkBorder2)',
  colorPaletteMinkForeground1: 'var(--colorPaletteMinkForeground1)',
  colorPaletteMinkForeground2: 'var(--colorPaletteMinkForeground2)',
  colorPaletteMinkForeground3: 'var(--colorPaletteMinkForeground3)',
  // Color palette navy tokens
  colorPaletteNavyBackground1: 'var(--colorPaletteNavyBackground1)',
  colorPaletteNavyBackground2: 'var(--colorPaletteNavyBackground2)',
  colorPaletteNavyBackground3: 'var(--colorPaletteNavyBackground3)',
  colorPaletteNavyBorderActive: 'var(--colorPaletteNavyBorderActive)',
  colorPaletteNavyBorder1: 'var(--colorPaletteNavyBorder1)',
  colorPaletteNavyBorder2: 'var(--colorPaletteNavyBorder2)',
  colorPaletteNavyForeground1: 'var(--colorPaletteNavyForeground1)',
  colorPaletteNavyForeground2: 'var(--colorPaletteNavyForeground2)',
  colorPaletteNavyForeground3: 'var(--colorPaletteNavyForeground3)',
  // Color palette orange tokens
  colorPaletteOrangeBackground1: 'var(--colorPaletteOrangeBackground1)',
  colorPaletteOrangeBackground2: 'var(--colorPaletteOrangeBackground2)',
  colorPaletteOrangeBackground3: 'var(--colorPaletteOrangeBackground3)',
  colorPaletteOrangeBorderActive: 'var(--colorPaletteOrangeBorderActive)',
  colorPaletteOrangeBorder1: 'var(--colorPaletteOrangeBorder1)',
  colorPaletteOrangeBorder2: 'var(--colorPaletteOrangeBorder2)',
  colorPaletteOrangeForeground1: 'var(--colorPaletteOrangeForeground1)',
  colorPaletteOrangeForeground2: 'var(--colorPaletteOrangeForeground2)',
  colorPaletteOrangeForeground3: 'var(--colorPaletteOrangeForeground3)',
  // Color palette orchid tokens
  colorPaletteOrchidBackground1: 'var(--colorPaletteOrchidBackground1)',
  colorPaletteOrchidBackground2: 'var(--colorPaletteOrchidBackground2)',
  colorPaletteOrchidBackground3: 'var(--colorPaletteOrchidBackground3)',
  colorPaletteOrchidBorderActive: 'var(--colorPaletteOrchidBorderActive)',
  colorPaletteOrchidBorder1: 'var(--colorPaletteOrchidBorder1)',
  colorPaletteOrchidBorder2: 'var(--colorPaletteOrchidBorder2)',
  colorPaletteOrchidForeground1: 'var(--colorPaletteOrchidForeground1)',
  colorPaletteOrchidForeground2: 'var(--colorPaletteOrchidForeground2)',
  colorPaletteOrchidForeground3: 'var(--colorPaletteOrchidForeground3)',
  // Color palette peach tokens
  colorPalettePeachBackground1: 'var(--colorPalettePeachBackground1)',
  colorPalettePeachBackground2: 'var(--colorPalettePeachBackground2)',
  colorPalettePeachBackground3: 'var(--colorPalettePeachBackground3)',
  colorPalettePeachBorderActive: 'var(--colorPalettePeachBorderActive)',
  colorPalettePeachBorder1: 'var(--colorPalettePeachBorder1)',
  colorPalettePeachBorder2: 'var(--colorPalettePeachBorder2)',
  colorPalettePeachForeground1: 'var(--colorPalettePeachForeground1)',
  colorPalettePeachForeground2: 'var(--colorPalettePeachForeground2)',
  colorPalettePeachForeground3: 'var(--colorPalettePeachForeground3)',
  // Color palette pink tokens
  colorPalettePinkBackground1: 'var(--colorPalettePinkBackground1)',
  colorPalettePinkBackground2: 'var(--colorPalettePinkBackground2)',
  colorPalettePinkBackground3: 'var(--colorPalettePinkBackground3)',
  colorPalettePinkBorderActive: 'var(--colorPalettePinkBorderActive)',
  colorPalettePinkBorder1: 'var(--colorPalettePinkBorder1)',
  colorPalettePinkBorder2: 'var(--colorPalettePinkBorder2)',
  colorPalettePinkForeground1: 'var(--colorPalettePinkForeground1)',
  colorPalettePinkForeground2: 'var(--colorPalettePinkForeground2)',
  colorPalettePinkForeground3: 'var(--colorPalettePinkForeground3)',
  // Color palette platinum tokens
  colorPalettePlatinumBackground1: 'var(--colorPalettePlatinumBackground1)',
  colorPalettePlatinumBackground2: 'var(--colorPalettePlatinumBackground2)',
  colorPalettePlatinumBackground3: 'var(--colorPalettePlatinumBackground3)',
  colorPalettePlatinumBorderActive: 'var(--colorPalettePlatinumBorderActive)',
  colorPalettePlatinumBorder1: 'var(--colorPalettePlatinumBorder1)',
  colorPalettePlatinumBorder2: 'var(--colorPalettePlatinumBorder2)',
  colorPalettePlatinumForeground1: 'var(--colorPalettePlatinumForeground1)',
  colorPalettePlatinumForeground2: 'var(--colorPalettePlatinumForeground2)',
  colorPalettePlatinumForeground3: 'var(--colorPalettePlatinumForeground3)',
  // Color palette plum tokens
  colorPalettePlumBackground1: 'var(--colorPalettePlumBackground1)',
  colorPalettePlumBackground2: 'var(--colorPalettePlumBackground2)',
  colorPalettePlumBackground3: 'var(--colorPalettePlumBackground3)',
  colorPalettePlumBorderActive: 'var(--colorPalettePlumBorderActive)',
  colorPalettePlumBorder1: 'var(--colorPalettePlumBorder1)',
  colorPalettePlumBorder2: 'var(--colorPalettePlumBorder2)',
  colorPalettePlumForeground1: 'var(--colorPalettePlumForeground1)',
  colorPalettePlumForeground2: 'var(--colorPalettePlumForeground2)',
  colorPalettePlumForeground3: 'var(--colorPalettePlumForeground3)',
  // Color palette pumpkin tokens
  colorPalettePumpkinBackground1: 'var(--colorPalettePumpkinBackground1)',
  colorPalettePumpkinBackground2: 'var(--colorPalettePumpkinBackground2)',
  colorPalettePumpkinBackground3: 'var(--colorPalettePumpkinBackground3)',
  colorPalettePumpkinBorderActive: 'var(--colorPalettePumpkinBorderActive)',
  colorPalettePumpkinBorder1: 'var(--colorPalettePumpkinBorder1)',
  colorPalettePumpkinBorder2: 'var(--colorPalettePumpkinBorder2)',
  colorPalettePumpkinForeground1: 'var(--colorPalettePumpkinForeground1)',
  colorPalettePumpkinForeground2: 'var(--colorPalettePumpkinForeground2)',
  colorPalettePumpkinForeground3: 'var(--colorPalettePumpkinForeground3)',
  // Color palette purple tokens
  colorPalettePurpleBackground1: 'var(--colorPalettePurpleBackground1)',
  colorPalettePurpleBackground2: 'var(--colorPalettePurpleBackground2)',
  colorPalettePurpleBackground3: 'var(--colorPalettePurpleBackground3)',
  colorPalettePurpleBorderActive: 'var(--colorPalettePurpleBorderActive)',
  colorPalettePurpleBorder1: 'var(--colorPalettePurpleBorder1)',
  colorPalettePurpleBorder2: 'var(--colorPalettePurpleBorder2)',
  colorPalettePurpleForeground1: 'var(--colorPalettePurpleForeground1)',
  colorPalettePurpleForeground2: 'var(--colorPalettePurpleForeground2)',
  colorPalettePurpleForeground3: 'var(--colorPalettePurpleForeground3)',
  // Color palette red tokens
  colorPaletteRedBackground1: 'var(--colorPaletteRedBackground1)',
  colorPaletteRedBackground2: 'var(--colorPaletteRedBackground2)',
  colorPaletteRedBackground3: 'var(--colorPaletteRedBackground3)',
  colorPaletteRedBorderActive: 'var(--colorPaletteRedBorderActive)',
  colorPaletteRedBorder1: 'var(--colorPaletteRedBorder1)',
  colorPaletteRedBorder2: 'var(--colorPaletteRedBorder2)',
  colorPaletteRedForeground1: 'var(--colorPaletteRedForeground1)',
  colorPaletteRedForeground2: 'var(--colorPaletteRedForeground2)',
  colorPaletteRedForeground3: 'var(--colorPaletteRedForeground3)',
  // Color palette royal blue tokens
  colorPaletteRoyalBlueBackground1: 'var(--colorPaletteRoyalBlueBackground1)',
  colorPaletteRoyalBlueBackground2: 'var(--colorPaletteRoyalBlueBackground2)',
  colorPaletteRoyalBlueBackground3: 'var(--colorPaletteRoyalBlueBackground3)',
  colorPaletteRoyalBlueBorderActive: 'var(--colorPaletteRoyalBlueBorderActive)',
  colorPaletteRoyalBlueBorder1: 'var(--colorPaletteRoyalBlueBorder1)',
  colorPaletteRoyalBlueBorder2: 'var(--colorPaletteRoyalBlueBorder2)',
  colorPaletteRoyalBlueForeground1: 'var(--colorPaletteRoyalBlueForeground1)',
  colorPaletteRoyalBlueForeground2: 'var(--colorPaletteRoyalBlueForeground2)',
  colorPaletteRoyalBlueForeground3: 'var(--colorPaletteRoyalBlueForeground3)',
  // Color palette seafoam tokens
  colorPaletteSeafoamBackground1: 'var(--colorPaletteSeafoamBackground1)',
  colorPaletteSeafoamBackground2: 'var(--colorPaletteSeafoamBackground2)',
  colorPaletteSeafoamBackground3: 'var(--colorPaletteSeafoamBackground3)',
  colorPaletteSeafoamBorderActive: 'var(--colorPaletteSeafoamBorderActive)',
  colorPaletteSeafoamBorder1: 'var(--colorPaletteSeafoamBorder1)',
  colorPaletteSeafoamBorder2: 'var(--colorPaletteSeafoamBorder2)',
  colorPaletteSeafoamForeground1: 'var(--colorPaletteSeafoamForeground1)',
  colorPaletteSeafoamForeground2: 'var(--colorPaletteSeafoamForeground2)',
  colorPaletteSeafoamForeground3: 'var(--colorPaletteSeafoamForeground3)',
  // Color palette silver tokens
  colorPaletteSilverBackground1: 'var(--colorPaletteSilverBackground1)',
  colorPaletteSilverBackground2: 'var(--colorPaletteSilverBackground2)',
  colorPaletteSilverBackground3: 'var(--colorPaletteSilverBackground3)',
  colorPaletteSilverBorderActive: 'var(--colorPaletteSilverBorderActive)',
  colorPaletteSilverBorder1: 'var(--colorPaletteSilverBorder1)',
  colorPaletteSilverBorder2: 'var(--colorPaletteSilverBorder2)',
  colorPaletteSilverForeground1: 'var(--colorPaletteSilverForeground1)',
  colorPaletteSilverForeground2: 'var(--colorPaletteSilverForeground2)',
  colorPaletteSilverForeground3: 'var(--colorPaletteSilverForeground3)',
  // Color palette steel tokens
  colorPaletteSteelBackground1: 'var(--colorPaletteSteelBackground1)',
  colorPaletteSteelBackground2: 'var(--colorPaletteSteelBackground2)',
  colorPaletteSteelBackground3: 'var(--colorPaletteSteelBackground3)',
  colorPaletteSteelBorderActive: 'var(--colorPaletteSteelBorderActive)',
  colorPaletteSteelBorder1: 'var(--colorPaletteSteelBorder1)',
  colorPaletteSteelBorder2: 'var(--colorPaletteSteelBorder2)',
  colorPaletteSteelForeground1: 'var(--colorPaletteSteelForeground1)',
  colorPaletteSteelForeground2: 'var(--colorPaletteSteelForeground2)',
  colorPaletteSteelForeground3: 'var(--colorPaletteSteelForeground3)',
  // Color palette teal tokens
  colorPaletteTealBackground1: 'var(--colorPaletteTealBackground1)',
  colorPaletteTealBackground2: 'var(--colorPaletteTealBackground2)',
  colorPaletteTealBackground3: 'var(--colorPaletteTealBackground3)',
  colorPaletteTealBorderActive: 'var(--colorPaletteTealBorderActive)',
  colorPaletteTealBorder1: 'var(--colorPaletteTealBorder1)',
  colorPaletteTealBorder2: 'var(--colorPaletteTealBorder2)',
  colorPaletteTealForeground1: 'var(--colorPaletteTealForeground1)',
  colorPaletteTealForeground2: 'var(--colorPaletteTealForeground2)',
  colorPaletteTealForeground3: 'var(--colorPaletteTealForeground3)',
  // Color palette yellow tokens
  colorPaletteYellowBackground1: 'var(--colorPaletteYellowBackground1)',
  colorPaletteYellowBackground2: 'var(--colorPaletteYellowBackground2)',
  colorPaletteYellowBackground3: 'var(--colorPaletteYellowBackground3)',
  colorPaletteYellowBorderActive: 'var(--colorPaletteYellowBorderActive)',
  colorPaletteYellowBorder1: 'var(--colorPaletteYellowBorder1)',
  colorPaletteYellowBorder2: 'var(--colorPaletteYellowBorder2)',
  colorPaletteYellowForeground1: 'var(--colorPaletteYellowForeground1)',
  colorPaletteYellowForeground2: 'var(--colorPaletteYellowForeground2)',
  colorPaletteYellowForeground3: 'var(--colorPaletteYellowForeground3)',
  // Border radius tokens
  borderRadiusNone: 'var(--borderRadiusNone)',
  borderRadiusSmall: 'var(--borderRadiusSmall)',
  borderRadiusMedium: 'var(--borderRadiusMedium)',
  borderRadiusLarge: 'var(--borderRadiusLarge)',
  borderRadiusXLarge: 'var(--borderRadiusXLarge)',
  borderRadiusCircular: 'var(--borderRadiusCircular)',
  // Font family tokens
  fontFamilyBase: 'var(--fontFamilyBase)',
  fontFamilyMonospace: 'var(--fontFamilyMonospace)',
  fontFamilyNumeric: 'var(--fontFamilyNumeric)',
  // Font size tokens
  fontSizeBase100: 'var(--fontSizeBase100)',
  fontSizeBase200: 'var(--fontSizeBase200)',
  fontSizeBase300: 'var(--fontSizeBase300)',
  fontSizeBase400: 'var(--fontSizeBase400)',
  fontSizeBase500: 'var(--fontSizeBase500)',
  fontSizeBase600: 'var(--fontSizeBase600)',
  fontSizeHero700: 'var(--fontSizeHero700)',
  fontSizeHero800: 'var(--fontSizeHero800)',
  fontSizeHero900: 'var(--fontSizeHero900)',
  fontSizeHero1000: 'var(--fontSizeHero1000)',
  // Font weight tokens
  fontWeightRegular: 'var(--fontWeightRegular)',
  fontWeightMedium: 'var(--fontWeightMedium)',
  fontWeightSemibold: 'var(--fontWeightSemibold)',
  // Line height tokens
  lineHeightBase100: 'var(--lineHeightBase100)',
  lineHeightBase200: 'var(--lineHeightBase200)',
  lineHeightBase300: 'var(--lineHeightBase300)',
  lineHeightBase400: 'var(--lineHeightBase400)',
  lineHeightBase500: 'var(--lineHeightBase500)',
  lineHeightBase600: 'var(--lineHeightBase600)',
  lineHeightHero700: 'var(--lineHeightHero700)',
  lineHeightHero800: 'var(--lineHeightHero800)',
  lineHeightHero900: 'var(--lineHeightHero900)',
  lineHeightHero1000: 'var(--lineHeightHero1000)',
  // Shadow tokens
  shadow2: 'var(--shadow2)',
  shadow4: 'var(--shadow4)',
  shadow8: 'var(--shadow8)',
  shadow16: 'var(--shadow16)',
  shadow28: 'var(--shadow28)',
  shadow64: 'var(--shadow64)',
  // Shadow brand tokens
  shadow2Brand: 'var(--shadow2Brand)',
  shadow4Brand: 'var(--shadow4Brand)',
  shadow8Brand: 'var(--shadow8Brand)',
  shadow16Brand: 'var(--shadow16Brand)',
  shadow28Brand: 'var(--shadow28Brand)',
  shadow64Brand: 'var(--shadow64Brand)',
  // Stroke width tokens
  strokeWidthThin: 'var(--strokeWidthThin)',
  strokeWidthThick: 'var(--strokeWidthThick)',
  strokeWidthThicker: 'var(--strokeWidthThicker)',
  strokeWidthThickest: 'var(--strokeWidthThickest)'
};

/**
 * Base button styles
 */

const baseButtonStyles = (context, definition) => css`
    ${display("inline-block")}

    :host .base{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin:0;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background-color:${tokens.colorNeutralBackground1};color:${tokens.colorNeutralForeground1};border:${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1};font-family:${tokens.fontFamilyBase};outline-style:none}:host(:hover) .base{background-color:${tokens.colorNeutralBackground1Hover};border-color:${tokens.colorNeutralStroke1Hover};color:${tokens.colorNeutralForeground1};cursor:pointer}:host(:active) .base{background-color:${tokens.colorNeutralBackground1Pressed};border-color:${tokens.colorNeutralStroke1Pressed};color:${tokens.colorNeutralForeground1};outline-style:none}:host([size][shape="circular"]) .base{border-radius:${tokens.borderRadiusCircular}}:host([size][shape="square"]) .base{border-radius:${tokens.borderRadiusNone}}:host([disabled]) .base,:host .base[aria-disabled="true"]{background-color:${tokens.colorNeutralBackgroundDisabled};border-color:${tokens.colorNeutralStrokeDisabled};color:${tokens.colorNeutralForegroundDisabled};cursor:not-allowed}:host .start,:host .end{display:inline-flex;align-content:center;justify-content:center}`;
/**
 * Primary button styles
 */

const primaryButtonStyles = (context, definition) => css`
    :host([appearance="primary"]) .base{background-color:${tokens.colorBrandBackground};border-color:transparent;color:${tokens.colorNeutralForegroundOnBrand}}:host([appearance="primary"]:hover) .base{background-color:${tokens.colorBrandBackgroundHover};border-color:transparent;color:${tokens.colorNeutralForegroundOnBrand}}:host([appearance="primary"]:active) .base{background-color:${tokens.colorBrandBackgroundPressed};border-color:transparent;color:${tokens.colorNeutralForegroundOnBrand}}:host([appearance="primary"][disabled]) .base,:host([appearance="primary"][disabled]:hover) .base,:host([appearance="primary"][disabled]:active) .base,:host([appearance="primary"]) .base[aria-disabled="true"],:host([appearance="primary"]:hover) .base[aria-disabled="true"],:host([appearance="primary"]:active) .base[aria-disabled="true"]{background-color:${tokens.colorNeutralBackgroundDisabled};border-color:${tokens.colorNeutralStrokeDisabled};color:${tokens.colorNeutralForegroundDisabled};cursor:not-allowed;border-color:transparent}`;
/**
 * Subtle button styles
 */

const subtleButtonStyles = (context, definition) => css`
    :host([appearance="subtle"]) .base{background-color:${tokens.colorSubtleBackground};border-color:transparent;color:${tokens.colorNeutralForeground2}}:host([appearance="subtle"]:hover) .base{background-color:${tokens.colorSubtleBackgroundHover};border-color:transparent;color:${tokens.colorNeutralForeground2BrandHover}}:host([appearance="subtle"]:active) .base{background-color:${tokens.colorSubtleBackgroundPressed};border-color:transparent;color:${tokens.colorNeutralForeground2BrandPressed}}:host([appearance="subtle"][disabled]) .base{background-color:${tokens.colorNeutralBackgroundDisabled};border-color:${tokens.colorNeutralStrokeDisabled};color:${tokens.colorNeutralForegroundDisabled};cursor:not-allowed}:host([appearance="subtle"][disabled]) .base,:host([appearance="subtle"][disabled]:hover) .base,:host([appearance="subtle"][disabled]:active) .base{background-color:transparent;border-color:transparent}`;
/**
 * Outline button styles
 */

const outlineButtonStyles = (context, definition) => css`
    :host([appearance="outline"]) .base{background-color:${tokens.colorTransparentBackground}}:host([appearance="outline"]:hover) .base{background-color:${tokens.colorTransparentBackgroundHover}}:host([appearance="outline"]:active) .base{background-color:${tokens.colorTransparentBackgroundPressed}}`;
/**
 * Transparent button styles
 */

const transparentButtonStyles = (context, definition) => css`
    :host([appearance="transparent"]) .base{background-color:${tokens.colorTransparentBackground};border-color:transparent;color:${tokens.colorNeutralForeground2}}:host([appearance="transparent"]:hover) .base{background-color:${tokens.colorTransparentBackgroundHover};border-color:transparent;color:${tokens.colorNeutralForeground2BrandHover}}:host([appearance="transparent"]:active) .base{background-color:${tokens.colorTransparentBackgroundPressed};border-color:transparent;color:${tokens.colorNeutralForeground2BrandPressed}}:host([appearance="transparent"][disabled]) .base,:host([appearance="transparent"][disabled]:hover) .base,:host([appearance="transparent"][disabled]:active) .base{background-color:transparent;border-color:transparent;color:${tokens.colorNeutralForegroundDisabled}}`;
/**
 * Small button styles
 */

const smallButtonStyles = (context, definition) => css`
    :host([size="small"]) .base{gap:4px;padding:0 8px;height:24px;min-width:64px;border-radius:${tokens.borderRadiusSmall};font-size:${tokens.fontSizeBase200};font-weight:${tokens.fontWeightRegular};line-height:${tokens.lineHeightBase200}}:host([size="small"]) ::slotted(svg){font-size:20px;height:20px;width:20px}:host([size="small"]) .base.icon-only{padding:4px;min-width:28px;max-width:28px}`;
/**
 * Medium button styles
 */

const mediumButtonStyles = (context, definition) => css`
    :host([size="medium"]) .base{gap:6px;padding:0 12px;height:32px;min-width:96px;border-radius:${tokens.borderRadiusMedium};font-size:${tokens.fontSizeBase300};font-weight:${tokens.fontWeightSemibold};line-height:${tokens.lineHeightBase300}}:host([size="medium"]) ::slotted(svg){font-size:20px;height:20px;width:20px}:host([size="medium"]) .base.icon-only{padding:0;min-width:32px;max-width:32px}`;
const largeButtonStyles = (context, definition) => css`
    :host([size="large"]) .base{gap:6px;padding:0 16px;height:40px;min-width:96px;border-radius:${tokens.borderRadiusLarge};font-size:${tokens.fontSizeBase300};font-weight:${tokens.fontWeightSemibold};line-height:${tokens.lineHeightBase300}}:host([size="large"]) ::slotted(svg){font-size:24px;height:24px;width:24px}:host([size="large"]) .base.icon-only{padding:0;min-width:40px;max-width:40px}`;

/**
 * Styles for Button
 * @public
 */

const buttonStyles = (context, definition) => css`
    ${baseButtonStyles()}
`.withBehaviors(appearanceBehavior("primary", css`
        ${primaryButtonStyles()}
    `), appearanceBehavior("subtle", css`
        ${subtleButtonStyles()}
    `), appearanceBehavior("outline", css`
        ${outlineButtonStyles()}
    `), appearanceBehavior("transparent", css`
        ${transparentButtonStyles()}
    `), sizeBehavior("small", css`
        ${smallButtonStyles()}
    `), sizeBehavior("medium", css`
        ${mediumButtonStyles()}
    `), sizeBehavior("large", css`
        ${largeButtonStyles()}
    `));

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements {@link @microsoft/fast-foundation#buttonTemplate}
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-button>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */

const fluentButton = Button.compose({
  baseName: "button",
  baseClass: Button$1,
  template: buttonTemplate$1,
  styles: buttonStyles,
  shadowOptions: {
    delegatesFocus: true
  }
});

/**
 * @internal
 */

class Link extends Anchor {
  constructor() {
    super(...arguments);
    /**
     * The link renders inline with text.
     *
     * @public
     * @remarks
     * HTML Attribute: inline
     */

    this.inline = false;
    /**
     * The link is disabled
     *
     * @public
     * @remarks
     * HTML Attribute: disabled
     */

    this.disabled = false;
    /**
     * The appearance the button should have.
     *
     * @public
     * @remarks
     * HTML Attribute: block
     */

    this.disabledFocusable = false;
  }

  handleDisabledClick(e) {
    if (this.disabled || this.disabledFocusable) {
      e.preventDefault();
    } else {
      return true;
    }
  }

  handleDisabledKeydown(e) {
    if ((this.disabled || this.disabledFocusable) && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      return true;
    }
  }

}

__decorate([attr], Link.prototype, "appearance", void 0);

__decorate([attr({
  mode: "boolean"
})], Link.prototype, "inline", void 0);

__decorate([attr({
  mode: "boolean"
})], Link.prototype, "disabled", void 0);

__decorate([attr({
  attribute: "disabledfocusable",
  mode: "boolean"
})], Link.prototype, "disabledFocusable", void 0);

/**
 * The template for the link component.
 * @public
 */

const linkTemplate = (context, definition) => html`<a class="base" part="base" download="${x => x.download}" tabindex="${x => x.disabledFocusable ? "0" : x.disabled ? "-1" : !!x.tabIndex || void 0}" href="${x => x.href}" hreflang="${x => x.hreflang}" ping="${x => x.ping}" referrerpolicy="${x => x.referrerpolicy}" rel="${x => x.rel}" target="${x => x.target}" type="${x => x.type}" aria-atomic="${x => x.ariaAtomic}" aria-busy="${x => x.ariaBusy}" aria-controls="${x => x.ariaControls}" aria-current="${x => x.ariaCurrent}" aria-describedby="${x => x.ariaDescribedby}" aria-details="${x => x.ariaDetails}" aria-disabled="${x => x.disabled || x.disabledFocusable || x.ariaDisabled}" aria-errormessage="${x => x.ariaErrormessage}" aria-expanded="${x => x.ariaExpanded}" aria-flowto="${x => x.ariaFlowto}" aria-haspopup="${x => x.ariaHaspopup}" aria-hidden="${x => x.ariaHidden}" aria-invalid="${x => x.ariaInvalid}" aria-keyshortcuts="${x => x.ariaKeyshortcuts}" aria-label="${x => x.ariaLabel}" aria-labelledby="${x => x.ariaLabelledby}" aria-live="${x => x.ariaLive}" aria-owns="${x => x.ariaOwns}" aria-relevant="${x => x.ariaRelevant}" aria-roledescription="${x => x.ariaRoledescription}" @click="${(x, c) => x.handleDisabledClick(c.event)}" @keydown="${(x, c) => x.handleDisabledKeydown(c.event)}" ${ref("control")}><slot></slot></a>`;

/**
 * Styles for Link
 * @public
 */

const linkStyles = (context, definition) => css`
    ${display("inline")}
    
    :host .base{background-color:transparent;border-top-style:none;border-left-style:none;border-right-style:none;border-bottom-color:transparent;border-bottom-style:solid;border-bottom-width:${tokens.strokeWidthThin};box-sizing:border-box;color:${tokens.colorBrandForegroundLink};cursor:pointer;font-family:${tokens.fontFamilyBase};font-size:${tokens.fontSizeBase300};font-weight:${tokens.fontWeightRegular};margin:0;padding:0;overlow:inherit;text-align:left;text-decoration-line:none;text-overflow:inherit;user-select:text}:host(:hover) .base{border-bottom-color:${tokens.colorBrandForegroundLinkHover};color:${tokens.colorBrandForegroundLinkHover}}:host(:active) .base{border-bottom-color:${tokens.colorBrandForegroundLinkPressed};color:${tokens.colorBrandForegroundLinkPressed}}:host([inline]),:host([inline]) .base{font-size:inherit;line-height:inherit}:host([disabled]) .base,:host([disabledfocusable]) .base{border-bottom-color:transparent;color:${tokens.colorNeutralForegroundDisabled};cursor:not-allowed}:host([inline]) .base{border-bottom-color:${tokens.colorBrandForegroundLink}}:host([inline][disabled]) .base,:host([inline][disabledfocusable]) .base{border-bottom-color:${tokens.colorNeutralForegroundDisabled}}`.withBehaviors(appearanceBehavior("subtle", css`
        :host([appearance="subtle"]) .base{color:${tokens.colorNeutralForeground2}}:host([appearance="subtle"]:hover) .base{border-bottom-color:${tokens.colorNeutralForeground2Hover};color:${tokens.colorNeutralForeground2Hover}}:host([appearance="subtle"]:active) .base{border-bottom-color:${tokens.colorNeutralForeground2Pressed};color:${tokens.colorNeutralForeground2Pressed}}:host([inline][appearance="subtle"]) .base{border-bottom-color:${tokens.colorNeutralForeground2}}:host([appearance="subtle"][disabled]) .base,:host([appearance="subtle"][disabledfocusable]) .base{border-bottom-color:transparent;color:${tokens.colorNeutralForegroundDisabled}}:host([appearance="subtle"][inline][disabled]) .base,:host([appearance="subtle"][inline][disabledfocusable]) .base{border-bottom-color:${tokens.colorNeutralForegroundDisabled}}`));

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-link>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */

const fluentLink = Link.compose({
  baseName: "link",
  template: linkTemplate,
  styles: linkStyles,
  shadowOptions: {
    delegatesFocus: true
  }
});

/**
 * The template for the {@link @microsoft/fast-foundation#(Button:class)} component.
 * @public
 */

const buttonTemplate = (context, definition) => html`<button class="base" part="base" ?autofocus="${x => x.autofocus}" ?disabled="${x => x.disabled}" tabindex="${x => x.disabledFocusable ? "0" : !!x.tabIndex || void 0}" form="${x => x.formId}" formaction="${x => x.formaction}" formenctype="${x => x.formenctype}" formmethod="${x => x.formmethod}" formnovalidate="${x => x.formnovalidate}" formtarget="${x => x.formtarget}" name="${x => x.name}" type="${x => x.type}" value="${x => x.value}" aria-atomic="${x => x.ariaAtomic}" aria-busy="${x => x.ariaBusy}" aria-controls="${x => x.ariaControls}" aria-current="${x => x.ariaCurrent}" aria-describedby="${x => x.ariaDescribedby}" aria-details="${x => x.ariaDetails}" aria-disabled="${x => x.disabledFocusable === true ? "true" : x.ariaDisabled}" aria-errormessage="${x => x.ariaErrormessage}" aria-expanded="${x => x.ariaExpanded}" aria-flowto="${x => x.ariaFlowto}" aria-haspopup="${x => x.ariaHaspopup}" aria-hidden="${x => x.ariaHidden}" aria-invalid="${x => x.ariaInvalid}" aria-keyshortcuts="${x => x.ariaKeyshortcuts}" aria-label="${x => x.ariaLabel}" aria-labelledby="${x => x.ariaLabelledby}" aria-live="${x => x.ariaLive}" aria-owns="${x => x.ariaOwns}" aria-pressed="${x => x.checked || x.ariaPressed}" aria-relevant="${x => x.ariaRelevant}" aria-roledescription="${x => x.ariaRoledescription}" @keypress="${(x, c) => x.keypressHandler(c.event)}" @click="${(x, c) => x.clickHandler(c.event)}" ${ref("control")}>${startSlotTemplate(context, definition)}<slot ${slotted("defaultSlottedContent")}></slot>${endSlotTemplate(context, definition)}</button>`;

/**
 * @internal
 */

class ToggleButton extends Button {
  constructor() {
    super();
    /**
     * Tracks whether the "checked" property has been changed.
     * This is necessary to provide consistent behavior with
     * normal input checkboxes
     */

    this.dirtyChecked = false;
    /**
     * Provides the default checkedness of the input element
     * Passed down to proxy
     *
     * @public
     * @remarks
     * HTML Attribute: checked
     */

    this.checkedAttribute = false;
    /**
     * The checked state of the control.
     *
     * @public
     */

    this.checked = false;
    /**
     * The current checkedness of the element. This property serves as a mechanism
     * to set the `checked` property through both property assignment and the
     * .setAttribute() method. This is useful for setting the field's checkedness
     * in UI libraries that bind data through the .setAttribute() API
     * and don't support IDL attribute binding.
     */

    this.currentChecked = false;
    /**
     * @internal
     */

    this.keypressHandler = e => {
      if (!this.disabled && !this.disabledFocusable) {
        switch (e.key) {
          case "Enter":
          case " ":
            this.checked = !this.checked;
            break;
        }
      }
    };
    /**
     * @internal
     */


    this.clickHandler = e => {
      if (!this.disabled && !this.disabledFocusable) {
        this.checked = !this.checked;
      }
    }; // Re-initialize dirtyChecked because initialization of other values
    // causes it to become true


    this.dirtyChecked = false;
  }

  checkedAttributeChanged() {
    this.defaultChecked = this.checkedAttribute;
  }

  defaultCheckedChanged() {
    if (!this.dirtyChecked) {
      // Setting this.checked will cause us to enter a dirty state,
      // but if we are clean when defaultChecked is changed, we want to stay
      // in a clean state, so reset this.dirtyChecked
      this.checked = this.defaultChecked;
      this.dirtyChecked = false;
    }
  }

  checkedChanged(prev, next) {
    if (!this.dirtyChecked) {
      this.dirtyChecked = true;
    }

    this.currentChecked = this.checked;

    if (prev !== undefined) {
      this.$emit("change");
    }
  }

  currentCheckedChanged(prev, next) {
    this.checked = this.currentChecked;
  }

}

__decorate([attr({
  attribute: "checked",
  mode: "boolean"
})], ToggleButton.prototype, "checkedAttribute", void 0);

__decorate([observable], ToggleButton.prototype, "defaultChecked", void 0);

__decorate([observable], ToggleButton.prototype, "checked", void 0);

__decorate([attr({
  attribute: "current-checked",
  mode: "boolean"
})], ToggleButton.prototype, "currentChecked", void 0);

/**
 * Styles for Button
 * @public
 */

const toggleButtonStyles = (context, definition) => css`
    ${baseButtonStyles()}

    :host([current-checked]) .base{background-color:${tokens.colorNeutralBackground1Selected};border-color:${tokens.colorNeutralStroke1};color:${tokens.colorNeutralForeground1};border-width:${tokens.strokeWidthThin}}:host([current-checked]:hover) .base{background-color:${tokens.colorNeutralBackground1Hover};border-color:${tokens.colorNeutralStroke1Hover};color:${tokens.colorNeutralForeground1}}:host([current-checked]:active) .base{background-color:${tokens.colorNeutralBackground1Pressed};border-color:${tokens.colorNeutralStroke1Pressed};color:${tokens.colorNeutralForeground1}}`.withBehaviors(appearanceBehavior("primary", css`
        ${primaryButtonStyles()}

        :host([current-checked][appearance="primary"]) .base{background-color:${tokens.colorBrandBackgroundSelected};border-color:transparent;color:${tokens.colorNeutralForegroundOnBrand}}:host([current-checked][appearance="primary"]:hover) .base{background-color:${tokens.colorBrandBackgroundHover}}:host([current-checked][appearance="primary"]:active) .base{background-color:${tokens.colorBrandBackgroundPressed}}`), appearanceBehavior("subtle", css`
        ${subtleButtonStyles()}

        :host([current-checked][appearance="subtle"]) .base{background-color:${tokens.colorSubtleBackgroundSelected};border-color:transparent;color:${tokens.colorNeutralForeground2BrandSelected}}:host([current-checked][appearance="subtle"]:hover) .base{background-color:${tokens.colorSubtleBackgroundHover};color:${tokens.colorNeutralForeground2BrandHover}}:host([current-checked][appearance="subtle"]:active) .base{background-color:${tokens.colorSubtleBackgroundPressed};color:${tokens.colorNeutralForeground2BrandPressed}}`), appearanceBehavior("outline", css`
        ${outlineButtonStyles()}

        :host([current-checked][appearance="outline"]) .base{background-color:${tokens.colorTransparentBackgroundSelected}}:host([current-checked][appearance="outline"]:hover) .base{background-color:${tokens.colorTransparentBackgroundHover}}:host([current-checked][appearance="outline"]:active) .base{background-color:${tokens.colorTransparentBackgroundPressed}}`), appearanceBehavior("transparent", css`
        ${transparentButtonStyles()}

        :host([current-checked][appearance="transparent"]) .base{background-color:${tokens.colorTransparentBackgroundSelected};border-color:transparent;color:${tokens.colorNeutralForeground2BrandSelected}}:host([current-checked][appearance="transparent"]:hover) .base{background-color:${tokens.colorTransparentBackgroundHover};color:${tokens.colorNeutralForeground2BrandHover}}:host([current-checked][appearance="transparent"]:active) .base{background-color:${tokens.colorTransparentBackgroundPressed};color:${tokens.colorNeutralForeground2BrandPressed}}`), sizeBehavior("small", css`
        ${smallButtonStyles()}
    `), sizeBehavior("medium", css`
        ${mediumButtonStyles()}
    `), sizeBehavior("large", css`
        ${largeButtonStyles()}
    `));

/**
 * A function that returns a Button registration for configuring the component with a DesignSystem.
 * Implements {@link @microsoft/fast-foundation#buttonTemplate}
 *
 *
 * @public
 * @remarks
 * Generates HTML Element: `<fluent-toggle-button>`
 *
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus | delegatesFocus}
 */

const fluentToggleButton = ToggleButton.compose({
  baseName: "toggle-button",
  template: buttonTemplate,
  styles: toggleButtonStyles,
  shadowOptions: {
    delegatesFocus: true
  }
});

/**
 * All Web Components
 * @public
 * @remarks
 * This object can be passed directly to the Design System's `register` method to
 * statically link and register all available components.
 */

const allComponents = {
  fluentButton,
  fluentLink,
  fluentToggleButton,

  register(container, ...rest) {
    if (!container) {
      // preserve backward compatibility with code that loops through
      // the values of this object and calls them as funcs with no args
      return;
    }

    for (const key in this) {
      if (key === "register") {
        continue;
      }

      this[key]().register(container, ...rest);
    }
  }

};

/**
 * Provides a design system for the specified element either by returning one that was
 * already created for that element or creating one.
 * @param element - The element to root the design system at. By default, this is the body.
 * @returns A Fluent Design System
 * @public
 */

function provideFluentDesignSystem(element) {
  return DesignSystem.getOrCreate(element).withPrefix("fluent");
}

/**
 * The global Fluent Design System.
 * @remarks
 * Only available if the components are added through a script tag
 * rather than a module/build system.
 */

const FluentDesignSystem = provideFluentDesignSystem().register(allComponents);

export { FluentDesignSystem, fluentButton, fluentLink, fluentToggleButton, provideFluentDesignSystem };
