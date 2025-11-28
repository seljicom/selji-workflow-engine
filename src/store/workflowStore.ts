import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global Zustand store for SELJI Workflow Engine.
 * Each workflow's state is isolated under its own namespace.
 *
 * All data persists to localStorage until manually cleared
 * or until a server restart (if you add a clear button).
 */

export const useWorkflowStore = create(
  persist(
    (set, get) => ({
      /* ----------------------------------------------------------
       * PA API EXECUTOR STATE
       * --------------------------------------------------------*/
      paapi: {
        accessKey: '',
        secretKey: '',
        partnerTag: '',
        marketplace: '',
        region: '',
        host: '',
        asins: '',
        response: null,
        error: null,
      },

      setPaapiField: (field, value) =>
        set({
          paapi: {
            ...get().paapi,
            [field]: value,
          },
        }),

      clearPaapi: () =>
        set({
          paapi: {
            accessKey: '',
            secretKey: '',
            partnerTag: '',
            marketplace: '',
            region: '',
            host: '',
            asins: '',
            response: null,
            error: null,
          },
        }),

      /* ----------------------------------------------------------
       * SHORT AMAZON URL → ASIN EXPANDER
       * --------------------------------------------------------*/
      asinExpander: {
        rawInput: '',
        results: [], // list of { url, finalUrl, asin, error }
      },

      setAsinExpanderField: (field, value) =>
        set({
          asinExpander: {
            ...get().asinExpander,
            [field]: value,
          },
        }),

      clearAsinExpander: () =>
        set({
          asinExpander: {
            rawInput: '',
            results: [],
          },
        }),

      /* ----------------------------------------------------------
       * FUTURE WORKFLOWS CAN BE ADDED HERE
       * --------------------------------------------------------*/
    }),
    {
      name: 'selji-workflow-engine', // localStorage key
      version: 1,
    }
  )
);