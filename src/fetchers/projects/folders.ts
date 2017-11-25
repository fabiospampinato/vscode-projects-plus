
/* IMPORT */

import * as _ from 'lodash';
import * as path from 'path';
import * as vscode from 'vscode';
import * as walker from 'walker';
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

  /* CONFIG */

  const config: any = {};

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

          if ( !config.projects ) config.projects = [];

          config.projects.push ({
            name: path.basename ( dir ),
            path: dir
          });

          return false;

        })
        .on ( 'error', _.noop )
        .on ( 'end', resolve );

    });

  }));

  return config;

}

/* EXPORT */

export {fetchProjectsFolders};
