
/* IMPORT */

import Item from './items/item';
import View from './view';
import Config from '../config';
import Utils from '../utils';

/* ALL */

class All extends View {

  async getChildren ( item?: Item ): Promise<Item[]> {

    const config = await Config.get (),
          configFiltered = Utils.config.filterByGroup ( config, config.group ),
          obj = item ? item.obj : configFiltered,
          {items} = await Utils.ui.makeItems ( config, obj, Utils.ui.makeViewItem, 0, 0 );

    return items;

  }

}

/* EXPORT */

export default All;
