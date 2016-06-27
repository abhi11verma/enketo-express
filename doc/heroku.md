Heroku deployment
=======================

### First time

1. Clone Enketo Express.
2. Install and configure the Heroku Toolbelt.
3. Create your Heroku application from your Enketo Express folder with `heroku create`.
3. Configure Enketo (see next section). The absolute minimum is setting `ENKETO_LINKED_FORM_AND_DATA_SERVER_SERVER_URL=`. This could be an empty value.
4. Push code to Heroku with `git push heroku master`.
5. Start web server with `heroku ps:scale web=1`. For multiple dynos upgrade to Standard or Performance first. You'll likely have to upgrade your heroku redis addons as well, at least the one containing the main database.
6. Create main database with `heroku addons:create heroku-redis:premium-0 --as enketo_redis_main`.
7. Create cache database with `heroku addons:create heroku-redis:premium-0 --as enketo_redis_cache`. Note that _heroku-redis:premium-0_ is persistent which is actually not necessary, but won't hurt either.
8. Make sure to check logs. You may have to upgrade the redis addons!

### Heroku configuration 

On Heroku, the regular config.json configuration should not be used. That file should not be created. Instead Enketo is configured with environment variables using `heroku config:set`. Just like with config.json, these environment variables will overwrite the default configuration set in [default-config.json](../config/default-config.json). To read how each configuration variable can be set using a (flat) configuration variable name, see [sample.env](../config/sample.env).

Enketo's JS and CSS **build process** uses configuration variables. This means that every time an environment variable (that is used in browser scripts) is changed, **Enketo needs to rebuild**. In Heroku rebuilds are always triggered with a git push. If there is nothing to push you'll therefore trick Heroku by pushing an empty commit like this: `git commit --allow-empty -m "empty commit"`.

### Advantages of using Heroku

1. Fastest possible deployment of your own Enketo server.
2. Easy scaling.
3. Reliable, presumably.

### Disadvantages of using Heroku

1. Initial Enketo configuration is more cumbersome (editing a structured json file is just easier and more user-friendly).
2. Expensive for small servers.
3. Little control. Requires trust (e.g. for database backups).
