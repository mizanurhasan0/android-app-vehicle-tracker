import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import {
  Banner,
  BannerInput,
  BannerRoute,
  bannerRoutes,
} from '../../api/management';
import { NoorIcon } from '../../components/Noor';
import { useManagement } from '../../context/ManagementContext';
import { useTranslation } from '../../i18n';
import { useAction } from '../../hooks/useAction';
import { pickStudentPhoto } from '../../utils/photo';
import { ValidationError } from '../../utils/validation';
import {
  AdminPage,
  Box,
  C,
  Choice,
  EmptyState,
  FormModal,
  Heading,
  IconButton,
  Input,
  Pill,
  SmallButton,
  s,
} from './AdminUi';

type BannerForm = {
  imageUrl: string;
  redirectRoute: BannerRoute | '';
  sortOrder: string;
  sliderDuration: string;
  active: string;
};

const blank = (): BannerForm => ({
  imageUrl: '',
  redirectRoute: 'Bills',
  sortOrder: '0',
  sliderDuration: '',
  active: 'true',
});

const isImage = (value: string) =>
  /^https:\/\/[^\s]+$/.test(value) ||
  /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

export function BannersScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh, mutate } = useManagement();
  const action = useAction();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(blank);
  const [modalVisible, setModalVisible] = useState(false);

  const openCreate = () => {
    action.clearFeedback();
    setEditing(null);
    setForm(blank());
    setModalVisible(true);
  };
  const openEdit = (banner: Banner) => {
    action.clearFeedback();
    setEditing(banner);
    setForm({
      imageUrl: banner.imageUrl,
      redirectRoute: banner.redirectRoute,
      sortOrder: String(banner.sortOrder),
      sliderDuration: banner.sliderDuration ? String(banner.sliderDuration) : '',
      active: banner.active === true || banner.active === 1 ? 'true' : 'false',
    });
    setModalVisible(true);
  };
  const close = () => {
    if (!action.busy) {
      setModalVisible(false);
      setEditing(null);
      setForm(blank());
    }
  };
  const save = () =>
    action.run(async () => {
      const errors: Record<string, string> = {};
      if (!isImage(form.imageUrl.trim()))
        errors.imageUrl = 'Add an HTTPS image URL or select an image.';
      if (!bannerRoutes.includes(form.redirectRoute as BannerRoute))
        errors.redirectRoute = 'Select a dashboard page.';
      if (!/^\d+$/.test(form.sortOrder.trim()))
        errors.sortOrder = 'Enter a valid display order.';
      if (
        form.sliderDuration.trim() &&
        !/^(?:[1-9]|[1-5]\d|60)$/.test(form.sliderDuration.trim())
      )
        errors.sliderDuration = 'Enter 1 to 60 seconds, or leave it empty.';
      if (Object.keys(errors).length) throw new ValidationError(errors);
      const payload: BannerInput = {
        imageUrl: form.imageUrl.trim(),
        redirectRoute: form.redirectRoute as BannerRoute,
        sortOrder: Number(form.sortOrder),
        sliderDuration: form.sliderDuration.trim()
          ? Number(form.sliderDuration)
          : null,
        active: form.active === 'true',
      };
      await mutate(
        editing ? '/admin/banners/' + editing.id : '/admin/banners',
        payload,
        editing ? 'PATCH' : 'POST',
      );
      setModalVisible(false);
      setEditing(null);
      setForm(blank());
    });
  const remove = (banner: Banner) =>
    Alert.alert(
      t('Delete banner'),
      t('This banner will be permanently removed.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () =>
            action.run(() =>
              mutate('/admin/banners/' + banner.id, undefined, 'DELETE'),
            ),
        },
      ],
    );

  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title="Dashboard banners"
        action="+ Create"
        onAction={openCreate}
      />
      <Text style={s.note}>
        {t('Choose an app page; slider time is optional and defaults to 5 seconds.')}
      </Text>
      {(data?.banners || []).map(banner => (
        <Box key={banner.id}>
          <View style={s.row}>
            {banner.imageUrl ? (
              <Image
                source={{ uri: banner.imageUrl }}
                style={bannerStyles.thumb}
              />
            ) : (
              <View style={bannerStyles.emptyThumb}>
                <NoorIcon name="document" size={22} color={C.green} />
              </View>
            )}
            <View style={s.flex}>
              <Text style={s.title} numberOfLines={1}>
                {banner.redirectRoute || t('No redirect page')}
              </Text>
              <Text style={s.muted}>
                {t('Order')}: {banner.sortOrder} · {banner.sliderDuration || 5}s
              </Text>
            </View>
            <IconButton
              title="Edit"
              icon="edit"
              onPress={() => openEdit(banner)}
            />
          </View>
          <View style={s.row}>
            <Pill
              value={
                banner.active === true || banner.active === 1
                  ? 'ACTIVE'
                  : 'INACTIVE'
              }
            />
            <View style={s.flex} />
            <SmallButton
              title="Delete"
              icon="close"
              danger
              onPress={() => remove(banner)}
            />
          </View>
        </Box>
      ))}
      {!loading && !(data?.banners || []).length ? (
        <EmptyState
          text="No dashboard banners"
          detail="Create an image banner to show on both dashboards."
        />
      ) : null}
      <FormModal
        title={editing ? 'Edit dashboard banner' : 'New dashboard banner'}
        visible={modalVisible}
        onClose={close}
        busy={action.busy}
        error={action.error}
        saveTitle={editing ? 'Update' : 'Create'}
        onSave={save}
      >
        <Input
          label="Image URL"
          value={form.imageUrl}
          error={action.fieldErrors.imageUrl}
          onChangeText={imageUrl => {
            action.clearFieldError('imageUrl');
            setForm(current => ({ ...current, imageUrl }));
          }}
          placeholder="https://example.com/banner.jpg"
          maxLength={450000}
          autoCapitalize="none"
          keyboardType="url"
        />
        <View style={s.row}>
          <SmallButton
            title="Add image"
            icon="plus"
            secondary
            busy={action.busy}
            onPress={() =>
              action.run(
                async () => {
                  const image = await pickStudentPhoto();
                  if (image) setForm(current => ({ ...current, imageUrl: image }));
                },
                '',
              )
            }
          />
          {form.imageUrl ? (
            <SmallButton
              title="Remove"
              secondary
              onPress={() => setForm(current => ({ ...current, imageUrl: '' }))}
            />
          ) : null}
        </View>
        {form.imageUrl ? (
          <Image source={{ uri: form.imageUrl }} style={bannerStyles.preview} />
        ) : null}
        <Choice
          label="Redirect page"
          value={form.redirectRoute}
          error={action.fieldErrors.redirectRoute}
          options={bannerRoutes.map(route => ({ value: route, label: route }))}
          onChange={redirectRoute => {
            action.clearFieldError('redirectRoute');
            setForm(current => ({
              ...current,
              redirectRoute: redirectRoute as BannerRoute,
            }));
          }}
          optional={false}
        />
        <Input
          label="Order number"
          value={form.sortOrder}
          error={action.fieldErrors.sortOrder}
          onChangeText={sortOrder => {
            action.clearFieldError('sortOrder');
            setForm(current => ({ ...current, sortOrder }));
          }}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Input
          label="Slider time (seconds)"
          value={form.sliderDuration}
          error={action.fieldErrors.sliderDuration}
          onChangeText={sliderDuration => {
            action.clearFieldError('sliderDuration');
            setForm(current => ({ ...current, sliderDuration }));
          }}
          placeholder="Optional, default 5"
          keyboardType="number-pad"
          maxLength={2}
        />
        <Choice
          label="Status"
          value={form.active}
          optional={false}
          options={[
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Hidden' },
          ]}
          onChange={active => setForm(current => ({ ...current, active }))}
        />
      </FormModal>
    </AdminPage>
  );
}

const bannerStyles = StyleSheet.create({
  thumb: { width: 64, height: 48, borderRadius: 7 },
  emptyThumb: {
    width: 64,
    height: 48,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.mint,
  },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: C.mint,
  },
});
