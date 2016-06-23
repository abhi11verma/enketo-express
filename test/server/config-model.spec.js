/* global describe, require, it, before, after */
'use strict';

// safer to ensure this here (in addition to grunt:env:test)
process.env.NODE_ENV = 'test';

var chai = require( 'chai' );
var expect = chai.expect;
var fs = require( 'fs' );
var path = require( 'path' );
var unCache = require( './require-uncache-helper' );
var configModulePath = '../../app/models/config-model';
var config = require( configModulePath );

describe( 'Config Model', function() {
    var themes = [ 'formhub', 'grid', 'kobo', 'plain' ];

    it( 'should return default list of themes', function() {
        expect( config.getThemesSupported() ).to.deep.equal( themes );
    } );

    it( 'should return only specified themes if given a list of themes', function() {
        var themeList = [ 'formhub', 'grid' ];
        expect( config.getThemesSupported( themeList ) ).to.deep.equal( themeList );
    } );

    it( 'should return only valid theme list if given a list containing a wrong theme name', function() {
        var themeList = [ 'grid', 'plain', 'doesnotexist' ];
        expect( config.getThemesSupported( themeList ) ).to.deep.equal( [ 'grid', 'plain' ] );
    } );


    describe( 'can be set using flat environment variables instead of config.json', function() {
        var testStringValue = 'test';

        before( function() {
            try {
                fs.renameSync( path.join( __dirname, '../../config/config.json' ), path.join( __dirname, '../../config/config.disabled.json' ) );
            } catch ( e ) {}
        } );

        after( function() {
            try {
                fs.renameSync( path.join( __dirname, '../../config/config.disabled.json' ), path.join( __dirname, '../../config/config.json' ) );

            } catch ( e ) {}
        } );

        it( 'for string values in a top level config item', function() {
            config = require( configModulePath );
            process.env.APP_NAME = testStringValue;
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server[ 'app name' ] ).to.equal( testStringValue );
        } );

        it( 'for boolean values in a top level config item', function() {
            config = require( configModulePath );
            expect( config.server[ 'offline enabled' ] ).to.equal( true );
            process.env.OFFLINE_ENABLED = 'false'; // string!
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server[ 'offline enabled' ] ).to.equal( false );
        } );

        it( 'for boolean values in a nested config item', function() {
            config = require( configModulePath );
            expect( config.server[ 'linked form and data server' ][ 'legacy formhub' ] ).to.equal( false );
            process.env.LINKED_FORM_AND_DATA_SERVER_LEGACY_FORMHUB = 'true'; // string!
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server[ 'linked form and data server' ][ 'legacy formhub' ] ).to.equal( true );
        } );

        it( 'for null values', function() {
            config = require( configModulePath );
            expect( config.server.support.email ).to.be.a( 'string' );
            process.env.SUPPORT_EMAIL = 'null'; // string!
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server.support.email ).to.deep.equal( null );
        } );

        it( 'for a config item that has a default value of null', function() {
            config = require( configModulePath );
            expect( config.server.redis.main.password ).to.deep.equal( null );
            process.env.REDIS_MAIN_PASSWORD = testStringValue;
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server.redis.main.password ).to.deep.equal( testStringValue );
        } );

        it( 'for a config item that has a default value of ""', function() {
            config = require( configModulePath );
            expect( config.server.google.analytics.ua ).to.deep.equal( '' );
            process.env.GOOGLE_ANALYTICS_UA = testStringValue;
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server.google.analytics.ua ).to.deep.equal( testStringValue );
        } );

        it( 'for array values that have default value of []', function() {
            process.env.THEMES_SUPPORTED_0 = 'grid';
            process.env.THEMES_SUPPORTED_1 = 'formhub';
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server[ 'themes supported' ] ).to.deep.equal( [ 'formhub', 'grid' ] );
        } );

        it( 'for array values that have a default first item only', function() {
            config = require( configModulePath );
            expect( config.server.maps[ 0 ].name ).to.deep.equal( 'streets' );
            process.env.MAPS_0_NAME = 'a';
            process.env.MAPS_1_NAME = 'b';
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server.maps[ 0 ].name ).to.deep.equal( 'a' );
            expect( config.server.maps[ 1 ].name ).to.deep.equal( 'b' );
        } );

        it( 'parses a redis url to its components', function() {
            process.env.REDIS_MAIN_URL = 'redis://h:pwd@ec2-54-221-230-53.compute-1.amazonaws.com:6869';
            unCache( configModulePath );
            config = require( configModulePath );
            expect( config.server.redis.main.host ).to.equal( 'ec2-54-221-230-53.compute-1.amazonaws.com' );
            expect( config.server.redis.main.port ).to.equal( '6869' );
            expect( config.server.redis.main.password ).to.equal( 'pwd' );
        } );

    } );

} );
