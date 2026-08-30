import type { Schema, Struct } from '@strapi/strapi';

export interface ServicesCaseItem extends Struct.ComponentSchema {
  collectionName: 'components_services_case_items';
  info: {
    displayName: 'Case Item';
    icon: 'arrowDown';
  };
  attributes: {
    case_image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    client_name: Schema.Attribute.String;
    result_data: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'services.case-item': ServicesCaseItem;
    }
  }
}
