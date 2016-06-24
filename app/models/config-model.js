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
    _updateConfigFromEnv( config );
    _setRedisConfigFromEnv();
}


function _updateConfigFromEnv( config ) {
    var parts;
    var part;
    var nextNumberIndex;
    var setting;
    var proceed;

    for ( var envVarName in process.env ) {
        if ( process.env.hasOwnProperty( envVarName ) && envVarName.indexOf( 'ENKETO_' ) === 0 ) {
            parts = envVarName.split( '_' ).slice( 1 ).map( _convertNumbers );
            nextNumberIndex = _findNumberIndex( parts );
            proceed = true;
            while ( proceed ) {
                proceed = false;
                part = parts.slice( 0, nextNumberIndex ).join( '_' );
                setting = _findSetting( config, part );
                if ( setting ) {
                    if ( !Array.isArray( setting[ 0 ][ setting[ 1 ] ] ) ) {
                        setting[ 0 ][ setting[ 1 ] ] = _convertType( process.env[ envVarName ] );
                    } else {
                        if ( nextNumberIndex === parts.length - 1 ) {
                            // simple populate array item (simple value)
                            setting[ 0 ][ setting[ 1 ] ][ parts[ nextNumberIndex ] ] = process.env[ envVarName ];
                        } else if ( typeof setting[ 0 ][ setting[ 1 ] ][ parts[ nextNumberIndex ] ] !== 'undefined' ) {
                            // this array item (object) already exists
                            nextNumberIndex = _findNumberIndex( parts, nextNumberIndex + 1 );
                            proceed = true;
                        } else {
                            // clone previous array item (object) and empty all property values
                            setting[ 0 ][ setting[ 1 ] ][ parts[ nextNumberIndex ] ] = _getEmptyClone( setting[ 0 ][ setting[ 1 ] ][ parts[ nextNumberIndex ] - 1 ] );
                            proceed = true;
                        }
                    }
                }
            }
        }
    }
}

function _convertType( str ) {
    switch ( str ) {
        case 'true':
            return true;
        case 'false':
            return false;
        case 'null':
            return null;
        default:
            return str;
    }
}

function _findSetting( obj, envName, prefix ) {
    var found;
    prefix = prefix || '';

    for ( var prop in obj ) {
        if ( obj.hasOwnProperty( prop ) ) {
            var propEnvStyle = prefix + prop.replace( / /g, '_' ).toUpperCase();
            if ( propEnvStyle === envName ) {
                return [ obj, prop ];
            } else if ( typeof obj[ prop ] === 'object' && obj[ prop ] !== null ) {
                found = _findSetting( obj[ prop ], envName, propEnvStyle + '_' );
                if ( found ) {
                    return found;
                }
            }
        }
    }
}

function _convertNumbers( str ) {
    // item is always a non-empty string
    var converted = Number( str );
    return !isNaN( converted ) ? converted : str;
}

function _findNumberIndex( arr, start ) {
    var i;
    start = start || 0;
    arr.some( function( val, index ) {
        if ( typeof val === 'number' && index >= start ) {
            i = index;
            return true;
        }
    } );
    return i;
}

function _getEmptyClone( obj ) {
    var clone = JSON.parse( JSON.stringify( obj ) );
    _emptyObjectProperties( clone );

    return clone;
}

function _emptyObjectProperties( obj ) {
    for ( var prop in obj ) {
        if ( typeof obj[ prop ] === 'object' && obj[ prop ] !== null ) {
            _emptyObjectProperties( obj[ prop ] );
        } else if ( obj[ prop ] ) {
            obj[ prop ] = ''; // let's hope this has no side-effects
        }
    }
}

function _setRedisConfigFromEnv() {
    var redisMainUrl = process.env.ENKETO_REDIS_MAIN_URL;
    var redisCacheUrl = process.env.ENKETO_REDIS_CACHE_URL;

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
