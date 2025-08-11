# Otterly JS

small, modular and flexible framework for your javascript front end.
Made to be highly configurable.

- think stimulus-js but simplified and relying on native javascript features more.
- or htmx if it wasn't quite as javascript allergic (our dive method can do alot without any javascript)

The framework with the most otter references in it.

[Docs Website](https://otterlyjs.org)


# Versioning

We use Break Versioning as described by [taoensso](https://www.taoensso.com/break-versioning). This means version number does not speak to stability but instead "how much does the current version break your code if you were using the previous version". How stable is otterly? Fairly stable might hit an issue or two, but I would not worry too much.

# Whats next

There are some situations where writing HTML on the front end is required / preferrable even for normally backend-rendered applications. I am currently seeing how that would work (while I make a codemirror extension). Once I come to a decision on how that would look with otterly, the newest features will be in that direction. For now if you want to do that kind of stuff now, look into JSX without react. It will compile your xml into javascript in compilation so you dont have to manually make a bunch of createElement calls. (You can then do a bunch of re-renders or morphs through data-ons).

