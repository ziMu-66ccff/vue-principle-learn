import { ref } from './Ref';
import { Comment, onUnmounted, unmount } from './createRenderer';

interface AsyncComponentOptions {
  loader: () => any;
  errorComponent?: any;
  loadingComponent?: any;
  timeout?: number;
  delay?: number;
}

function defineAsyncComponent(options: (() => any) | AsyncComponentOptions) {
  if (typeof options === 'function') {
    options = {
      loader: options,
    };
  }
  let innerComponent: any = null;
  const { loader } = options;
  return {
    name: 'AsyncComponentWrapper',
    setup() {
      const loaded = ref(false);
      const loading = ref(false);
      let loadingTimer: any = null;
      let timer: any = null;
      const error = ref(null);

      if ((options as AsyncComponentOptions).delay) {
        timer = setTimeout(() => {
          loading.value = true;
        }, (options as AsyncComponentOptions).delay);
      } else {
        loading.value = true;
      }
      loader()
        .then((component: any) => {
          innerComponent = component;
          loaded.value = true;
        })
        .catch((e: any) => {
          error.value = e;
        })
        .finally(() => {
          loading.value = false;
          clearTimeout(loadingTimer);
        });
      if ((options as AsyncComponentOptions).timeout) {
        timer = setTimeout(() => {
          const err = new Error(
            `timed out after ${(options as AsyncComponentOptions).timeout} ms`
          );
          error.value = err;
        }, (options as AsyncComponentOptions).timeout);
      }
      if (timer) {
        onUnmounted(() => {
          clearTimeout(timer);
        });
      }
      const placeholder = { type: Comment, childen: '' };
      return () => {
        if (loaded.value) {
          unmount((options as AsyncComponentOptions).loadingComponent);
          return { type: innerComponent };
        } else if (
          error.value &&
          (options as AsyncComponentOptions).errorComponent
        ) {
          return {
            type: (options as AsyncComponentOptions).errorComponent,
            props: error.value,
          };
        } else {
          return placeholder;
        }
      };
    },
  };
}
