import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../contexts/MainContext';

const useNavigationWithLoader = () => {
  const navigation = useNavigation();
  const { setNavigationLoading } = useMainContext();

  const navigateWithLoader = (screenName, params = {}) => {
    setNavigationLoading(true);
    setTimeout(() => {
      navigation.navigate(screenName, params);
      setNavigationLoading(false);
    }, 100); // Short delay to show loader
  };

  const goBackWithLoader = () => {
    setNavigationLoading(true);
    setTimeout(() => {
      navigation.goBack();
      setNavigationLoading(false);
    }, 100);
  };

  return {
    ...navigation,
    navigate: navigateWithLoader,
    goBack: goBackWithLoader,
  };
};

export default useNavigationWithLoader;
