'use strict';

var localConfig;
var config = require( '../../config/default-config' );
var pkg = require( '../../package' );
var merge = require( 'lodash/merge' );
var path = require( 'path' );
var fs = require( 'fs' );
var themePath = path.join( __dirname, '../../public/css' );
var languagePath = path.join( __dirname, '../../locales' );
// var debug = require( 'debug' )( 'config-model' );

// merge default and local config files 
try {
    localConfig = fs.statSync( path.resolve( __dirname, '../../config/config' ) );
    merge( config, localConfig );
}
// override default config with environement variables
catch ( err ) {
    console.log( 'No local config.json found. Will check environment variables instead.' );
    _setConfigObjFromEnv( config );
}

// Unfortunately environment variables are flat, so we have to convert to a flat naming convention.
function _setConfigObjFromEnv( obj, prefix ) {
    prefix = prefix || '';

    for ( var propName in obj ) {
        if ( typeof obj[ propName ] === 'object' ) {
            _setConfigObjFromEnv( obj[ propName ], prefix + propName + '_' );
        } else {
            _setConfigValueFromEnv( obj, propName, prefix );
        }
    }
}

function _setConfigValueFromEnv( obj, prop, prefix ) {
    // convert structured property to flat ENV variable name
    var envVar = ( prefix + prop ).replace( / /g, '_' ).toUpperCase();
    var override = process.env[ envVar ];
    if ( override ) {
        obj[ prop ] = override;
    }
    // TODO: if Array,isArray(obj), also check for subsequent items
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
