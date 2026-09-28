import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/vendor_provider.dart';
import '../../theme/app_colors.dart';

class VendorsTab extends StatefulWidget {
  const VendorsTab({super.key});

  @override
  State<VendorsTab> createState() => _VendorsTabState();
}

class _VendorsTabState extends State<VendorsTab> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      context.read<VendorProvider>().fetchVendors();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showVendorFormModal([VendorModel? vendor]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _VendorFormModal(vendor: vendor),
    );
  }

  void _confirmDeleteVendor(VendorModel v) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Hapus Vendor'),
        content: Text('Apakah Anda yakin ingin menghapus vendor "${v.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<VendorProvider>().deleteVendor(v.id);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Vendor berhasil dihapus!'), backgroundColor: AppColors.success),
                  );
                } else {
                  final err = context.read<VendorProvider>().error ?? 'Gagal menghapus vendor.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err), backgroundColor: AppColors.danger),
                  );
                }
              }
            },
            child: const Text('Hapus Vendor'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final role = user?.role ?? 'MEMBER';

    if (role == 'CLIENT') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: AppColors.danger),
              const SizedBox(height: 16),
              const Text('Akses Terbatas Internal', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      );
    }

    final canManage = role == 'OWNER' || role == 'FINANCE' || role == 'PM' || role == 'PROJECT_MANAGER';
    final vendorProvider = context.watch<VendorProvider>();
    final vendorsList = vendorProvider.vendors;

    final query = _searchController.text.toLowerCase().trim();
    final filteredVendors = vendorsList.where((v) {
      final nameStr = v.name.toLowerCase();
      final contactStr = (v.contactPerson ?? '').toLowerCase();
      return query.isEmpty || nameStr.contains(query) || contactStr.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showVendorFormModal(),
              icon: const Icon(Icons.storefront),
              label: const Text('Tambah Vendor'),
              backgroundColor: AppColors.primary,
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () => vendorProvider.fetchVendors(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Manajemen Vendor & Subkontraktor', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            const Text(
              'Daftar penyedia barang, jasa, dan subkontraktor pihak ketiga proyek',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 16),

            // Search Bar
            Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search, size: 18, color: AppColors.textMuted),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'Cari vendor (nama atau kontak)...',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (vendorProvider.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (filteredVendors.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Text('Belum ada vendor terdaftar.', style: TextStyle(color: AppColors.textMuted)),
                ),
              )
            else
              ...filteredVendors.map((v) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primaryLight,
                          child: const Icon(Icons.storefront, color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(v.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              if (v.contactPerson != null)
                                Text('Kontak: ${v.contactPerson}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              if (v.phone != null || v.email != null)
                                Text('${v.phone ?? ""} ${v.email ?? ""}', style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                        if (canManage) ...[
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                            onPressed: () => _showVendorFormModal(v),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                            onPressed: () => _confirmDeleteVendor(v),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _VendorFormModal extends StatefulWidget {
  final VendorModel? vendor;
  const _VendorFormModal({this.vendor});

  @override
  State<_VendorFormModal> createState() => _VendorFormModalState();
}

class _VendorFormModalState extends State<_VendorFormModal> {
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final v = widget.vendor;
    if (v != null) {
      _nameController.text = v.name;
      _contactController.text = v.contactPerson ?? '';
      _emailController.text = v.email ?? '';
      _phoneController.text = v.phone ?? '';
      _addressController.text = v.address ?? '';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _contactController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _submit() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama vendor wajib diisi.'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final data = {
      'name': name,
      'contactPerson': _contactController.text.trim(),
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'address': _addressController.text.trim(),
    };

    bool success;
    if (widget.vendor == null) {
      success = await context.read<VendorProvider>().createVendor(data);
    } else {
      success = await context.read<VendorProvider>().updateVendor(widget.vendor!.id, data);
    }

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.vendor == null ? 'Vendor berhasil dibuat!' : 'Vendor berhasil diperbarui!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        final err = context.read<VendorProvider>().error ?? 'Gagal menyimpan vendor.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.vendor == null ? 'Tambah Vendor Baru' : 'Edit Vendor', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nama Perusahaan / Vendor *')),
            const SizedBox(height: 12),
            TextField(controller: _contactController, decoration: const InputDecoration(labelText: 'Contact Person')),
            const SizedBox(height: 12),
            TextField(controller: _emailController, decoration: const InputDecoration(labelText: 'Email Vendor')),
            const SizedBox(height: 12),
            TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Nomor Telepon')),
            const SizedBox(height: 12),
            TextField(controller: _addressController, decoration: const InputDecoration(labelText: 'Alamat Perusahaan')),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(widget.vendor == null ? 'Simpan Vendor' : 'Perbarui Vendor', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
