'use strict';

var localConfig;
var config = require( '../../config/default-config' );
var pkg = require( '../../package' );
var merge = require( 'lodash/merge' );
var path = require( 'path' );
var fs = require( 'fs' );
var url = require( 'url' );
var themePath = path.join( __dirname, '../../public/css' );
var languagePath = path.join( __dirname, '../../locales' );
// var debug = require( 'debug' )( 'config-model' );

// Merge default and local config files if a local config.json file exists
try {
    localConfig = require( '../../config/config' );
    merge( config, localConfig );
}
// Override default config with environment variables if a local config.json does not exist
catch ( err ) {
    console.log( 'No local config.json found. Will check environment variables instead.' );
    _setConfigObjFromEnv( config );
    _setRedisConfigFromEnv();
}

/**
 * Overrides a configuration object with values provided by environment variables.
 * 
 * @param {*} obj    The configuration object to set.
 * @param {string} prefix A prefix to use to create a flat variable (for nested objects).
 */
function _setConfigObjFromEnv( obj, prefix ) {
    prefix = prefix || '';
    // Unfortunately environment variables are flat, so we have to convert to a flat naming convention.
    for ( var propName in obj ) {
        if ( typeof obj[ propName ] === 'object' ) {
            _setConfigObjFromEnv( obj[ propName ], prefix + propName + '_' );
        } else {
            _setConfigValueFromEnv( obj, propName, prefix );
        }
    }
}

/**
 * Sets a configuration variable with the value set in its corresponding environment variable.
 * 
 * @param {[type]} obj    The configuration object to set.
 * @param {[type]} prop   The property of this configuration object to set.
 * @param {[type]} prefix The prefix to use to find a flat enviroment variable of a nested object property.
 */
function _setConfigValueFromEnv( obj, prop, prefix ) {
    // convert structured property to flat environment variable name
    var envVar = ( prefix + prop ).replace( / /g, '_' ).toUpperCase();
    var override = process.env[ envVar ];

    if ( override === 'true' ) {
        override = true;
    }
    if ( override === 'false' ) {
        override = false;
    }
    if ( typeof override !== 'undefined' ) {
        obj[ prop ] = override;
    }
    // TODO: if Array,isArray(obj), also check for subsequent items
}

function _setRedisConfigFromEnv() {
    var redisMainUrl = process.env.REDIS_MAIN_URL;
    var redisCacheUrl = process.env.REDIS_CACHE_URL;

    if ( redisMainUrl ) {
        config.redis.main = _extractRedisConfigFromUrl( redisMainUrl );
    }
    if ( redisCacheUrl ) {
        config.redis.cache = _extractRedisConfigFromUrl( redisCacheUrl );
    }
}

function _extractRedisConfigFromUrl( redisUrl ) {
    var parsedUrl = url.parse( redisUrl );
    var password = parsedUrl.auth && parsedUrl.auth.split( ':' )[ 1 ] ? parsedUrl.auth.split( ':' )[ 1 ] : null;

    return {
        host: parsedUrl.hostname,
        port: parsedUrl.port,
        password: password
    };
}

/**
 * Returns a list of supported themes,
 * in case a list is provided only the ones that exists are returned.
 * 
 * @param {Array} themeList - a list of themes e.g ['formhub', 'grid']
 * @return {Array}
 */
function getThemesSupported( themeList ) {
    var themes = [];

    if ( fs.existsSync( themePath ) ) {
        fs.readdirSync( themePath ).forEach( function( file ) {
            var matches = file.match( /^theme-([A-z\-]+)\.css$/ );
            if ( matches && matches.length > 1 ) {
                if ( themeList !== undefined && themeList.length ) {
                    if ( themeList.indexOf( matches[ 1 ] ) !== -1 ) {
                        themes.push( matches[ 1 ] );
                    }
                } else {
                    themes.push( matches[ 1 ] );
                }
            }
        } );
    }

    return themes;
}

config[ 'version' ] = pkg.version;

// detect supported themes
config[ 'themes supported' ] = getThemesSupported( config[ 'themes supported' ] );

// detect supported languages
config[ 'languages supported' ] = fs.readdirSync( languagePath ).filter( function( file ) {
    return file.indexOf( '.' ) !== 0 && fs.statSync( path.join( languagePath, file ) ).isDirectory();
} );

// if necessary, correct the base path to use for all routing
if ( config[ 'base path' ] && config[ 'base path' ].indexOf( '/' ) !== 0 ) {
    config[ 'base path' ] = '/' + config[ 'base path' ];
}
if ( config[ 'base path' ] && config[ 'base path' ].lastIndexOf( '/' ) === config[ 'base path' ].length - 1 ) {
    config[ 'base path' ] = config[ 'base path' ].substring( 0, config[ 'base path' ].length - 1 );
}

module.exports = {
    server: config,
    client: {
        googleApiKey: config.google[ 'api key' ],
        maps: config.maps,
        widgets: config.widgets,
        modernBrowsersURL: 'modern-browsers',
        supportEmail: config.support.email,
        themesSupported: config[ 'themes supported' ],
        languagesSupported: config[ 'languages supported' ],
        submissionParameter: {
            name: config[ 'query parameter to pass to submission' ]
        },
        basePath: config[ 'base path' ]
    },
    getThemesSupported: getThemesSupported
};
