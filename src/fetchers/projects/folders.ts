
/* IMPORT */

import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import * as walker from 'walker';
import Config from '../../config';
import Utils from '../../utils';

/* HELPERS */

function getPathDepth ( filePath ) {

  return filePath.split ( path.sep ).length;

}

/* GENERAL */

async function fetchProjectsFolders ( roots, depth, ignoreFolders, matchFolders ) {

  /* CHECKS */

  if ( !roots.length ) return {};

  for ( let root of roots ) {

    if ( Utils.folder.exists ( root ) ) continue;

    vscode.window.showWarningMessage ( `Directory ${root} doesn't exist` );

    return {};

  }

  /* VARIABLES */

  const config = await Config.get (),
        found: any = {};

  /* WALK ROOTS */

  await Promise.all ( roots.map ( root => {

    const maxDepth = getPathDepth ( root ) + depth;

    return new Promise ( resolve => {

      walker ( root )
        .filterDir ( dir => {

          const isIgnored = ignoreFolders.includes ( dir ) || ignoreFolders.includes ( path.basename ( dir ) ) || getPathDepth ( dir ) > maxDepth;

          if ( isIgnored ) return false;

          const isRepository = !!matchFolders.find ( match => Utils.folder.exists ( path.join ( dir, match ) ) );

          if ( !isRepository ) return true;

          const projectName = path.basename ( dir ),
                projectPath = config.useTilde ? Utils.path.tildify ( dir ) : dir;

          let obj = found;

          if ( config.inferGroups ) {
            const groups = path.relative( root, path.dirname( dir ) ).split( path.sep );

            obj = groups.reduce( ( acc, group ) => {
              if ( !acc.groups ) acc.groups = [];

              const foundGroup = acc.groups.find( x => x.name == group );

              if ( foundGroup ) {
                return foundGroup;
              }

              const newObj = {
                name: group,
              };

              acc.groups.push( newObj );

              return newObj;
            }, found );
          }

          if ( !obj.projects ) obj.projects = [];

          obj.projects.push ({
            name: projectName,
            path: projectPath
          });

          return false;

        })
        .on ( 'error', _.noop )
        .on ( 'end', resolve );

    });

  }));

  return found;

}

/* EXPORT */

export {fetchProjectsFolders};
